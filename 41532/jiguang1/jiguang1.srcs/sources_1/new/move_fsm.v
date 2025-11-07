`timescale 1ns/1ps
// =============================================================================
// move_fsm.v - 逐点打标运动+曝光状态机（可直接用于仿真/联调）
// 依赖：stepper_ctrl（你已提供）、laser_ctrl（你已提供）
// 输入：run_en（开始）、x/y/pixel/frame_valid（像素流）
// 输出：对 stepper_ctrl 的一次移动命令 + 对 laser_ctrl 的曝光门控和功率
// 重要：frame_valid 是【像素包有效脉冲】，在收到该像素包最后一个字节 0x55 后
//       约 1 个时钟延迟拉高，并保持约 2 个时钟宽（按你当前实现）。
//       本 FSM 在空闲态对 frame_valid 的【上升沿】进行锁存。
// =============================================================================
module move_fsm #(
    parameter DWELL_TICKS = 32'd50000,   // 每个像素曝光门控时长（@50MHz ≈1ms）
    parameter MAX_POWER   = 10'd1023      // 激光功率上限（laser_power 的 10bit 满量程）
)(
    input  wire        clk,
    input  wire        reset_n,

    // 运行使能（例如按键后置 1）；为 0 时 FSM 保持等待，不取样新像素
    input  wire        run_en,

    // 来自 uart_rx_image 的像素坐标/强度；frame_valid 为"像素包有效"脉冲（~2clk 宽）
    input  wire [15:0] x_in,
    input  wire [15:0] y_in,
    input  wire [7:0]  pixel,
    input  wire        frame_valid,

    // 对 stepper_ctrl 的命令/握手（与现有 stepper_ctrl 端口对齐）
    output reg         data_ready,
    output reg  [11:0] start_x,
    output reg  [11:0] start_y,
    output reg  [11:0] target_x,
    output reg  [11:0] target_y,
    input  wire        step_busy,
    input  wire        step_done,

    // 对激光控制器（连续 PWM，占空比由激光功率决定）
    output reg         laser_en,
    output reg  [9:0]  laser_power,

    // 当前位置寄存器（便于观测）
    output reg  [11:0] cur_x,
    output reg  [11:0] cur_y,

    // 运行忙指示（可选）
    output reg         busy
);
    wire reset;
    assign reset = ~reset_n;

    // ---------------- 内部寄存器 ----------------
    reg  [15:0] x_latch, y_latch;
    reg  [7:0]  pix_latch;
    reg  [31:0] dwell_cnt;

    // 对 frame_valid 做同步与上升沿检测（满足"包尾后约1clk拉高且宽度≈2clk"的时序）
    reg fv_d1, fv_d2;
    wire fv_rise;
    assign fv_rise = fv_d1 & ~fv_d2;  // 单拍上升沿

    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            fv_d1 <= 1'b0; fv_d2 <= 1'b0;
        end else begin
            fv_d1 <= frame_valid;
            fv_d2 <= fv_d1;
        end
    end

    // ---- 状态机编码（Verilog-2001 兼容）----
    localparam [2:0]
        S_IDLE  = 3'd0,
        S_LATCH = 3'd1,
        S_MOVE  = 3'd2,
        S_FIRE  = 3'd3,
        S_DONE  = 3'd4;

    reg [2:0] state, state_n;

    // 8bit 像素 -> 10bit 激光功率（线性映射）
    function [9:0] pixel_to_power;
        input [7:0] px;
        reg   [17:0] mult; // 8bit*10bit
        begin
            mult = px * MAX_POWER;
            pixel_to_power = mult / 8'd255;
        end
    endfunction

    // ---------------- 组合逻辑：状态转移 ----------------
    always @* begin
        state_n = state;
        case (state)
            S_IDLE:  if (run_en && fv_rise) state_n = S_LATCH; // 仅对上升沿响应
            S_LATCH:                         state_n = S_MOVE;
            S_MOVE:   if (step_done)         state_n = S_FIRE;
            S_FIRE:   if (dwell_cnt == 0)    state_n = S_DONE;
            S_DONE:                          state_n = S_IDLE;   // 逐点；回到空闲
            default:                         state_n = S_IDLE;
        endcase
    end

    // ---------------- 时序逻辑：状态/输出/计数器 ----------------
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            state       <= S_IDLE;
            x_latch     <= 16'd0;
            y_latch     <= 16'd0;
            pix_latch   <= 8'd0;
            start_x     <= 12'd0;
            start_y     <= 12'd0;
            target_x    <= 12'd0;
            target_y    <= 12'd0;
            data_ready  <= 1'b0;
            laser_en    <= 1'b0;
            laser_power <= 10'd0;
            dwell_cnt   <= 32'd0;
            cur_x       <= 12'd0;
            cur_y       <= 12'd0;
            busy        <= 1'b0;
        end else begin
            state <= state_n;
            data_ready <= 1'b0; // 单拍

            case (state)
                S_IDLE: begin
                    busy     <= 1'b0;
                    laser_en <= 1'b0;
                    if (run_en && fv_rise) begin
                        // 在有效脉冲的上升沿锁存像素
                        x_latch   <= x_in;
                        y_latch   <= y_in;
                        pix_latch <= pixel;
                    end
                end
                S_LATCH: begin
                    busy      <= 1'b1;
                    start_x   <= cur_x;
                    start_y   <= cur_y;
                    target_x  <= x_latch[11:0];
                    target_y  <= y_latch[11:0];
                    data_ready<= 1'b1;      // 触发 stepper_ctrl
                end
                S_MOVE: begin
                    // 等待 step_done
                end
                S_FIRE: begin
                    // 移动完成后更新当前位置
                    cur_x <= target_x;
                    cur_y <= target_y;
                    // 像素强度映射功率；像素为 0 则不使能激光
                    laser_power <= pixel_to_power(pix_latch);
                    laser_en    <= (pix_latch != 8'd0);
                    // 曝光计数递减
                    if (dwell_cnt == 0) dwell_cnt <= DWELL_TICKS[31:0];
                    else                dwell_cnt <= dwell_cnt - 1'b1;
                end
                S_DONE: begin
                    laser_en  <= 1'b0;
                    dwell_cnt <= 32'd0;
                end
                default: ;
            endcase
        end
    end
endmodule

