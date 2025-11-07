`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// 改进的按键去抖模块
// 功能：消除按键抖动，输出单周期脉冲信号
//////////////////////////////////////////////////////////////////////////////////

module key_debounce(
    input  wire clk,        // 系统时钟 50MHz
    input  wire reset_n,    // 复位信号，低电平有效
    input  wire key_in,     // 按键输入
    output reg  key_flag    // 按键标志信号（单周期脉冲）
);

    wire reset;
    assign reset = ~reset_n;
    
    // 状态定义
    localparam
        IDLE    = 4'b0001,
        FILTER0 = 4'b0010,
        DOWN    = 4'b0100,
        FILTER1 = 4'b1000;

    reg [3:0]  state;
    reg [19:0] cnt;
    reg        en_cnt;
    reg        cnt_full;
    
    // 同步寄存器
    reg key_in_sync1;
    reg key_in_sync2;
    reg key_in_reg1;
    reg key_in_reg2;
    
    // 边沿检测
    wire key_in_pedge;
    wire key_in_nedge;

    // 输入信号同步化
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            key_in_sync1 <= 1'b1;  // 默认高电平（按键未按下）
            key_in_sync2 <= 1'b1;
        end else begin
            key_in_sync1 <= key_in;
            key_in_sync2 <= key_in_sync1;
        end
    end
    
    // 边沿检测寄存器
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            key_in_reg1 <= 1'b1;
            key_in_reg2 <= 1'b1;
        end else begin
            key_in_reg1 <= key_in_sync2;
            key_in_reg2 <= key_in_reg1;
        end
    end

    // 边沿检测信号
    assign key_in_nedge = !key_in_reg1 & key_in_reg2;   // 下降沿
    assign key_in_pedge = key_in_reg1 & (!key_in_reg2); // 上升沿

    // 按键去抖状态机
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            en_cnt <= 1'b0;
            state <= IDLE;
            key_flag <= 1'b0;
        end else begin
            case (state)
                IDLE: begin
                    key_flag <= 1'b0;
                    if (key_in_nedge) begin
                        state <= FILTER0;
                        en_cnt <= 1'b1;
                    end else begin
                        state <= IDLE;
                    end
                end

                FILTER0: begin
                    if (cnt_full) begin
                        key_flag <= 1'b1;  // 输出单周期脉冲
                        en_cnt <= 1'b0;
                        state <= DOWN;
                    end else if (key_in_pedge) begin
                        state <= IDLE;
                        en_cnt <= 1'b0;
                    end else begin
                        state <= FILTER0;
                    end
                end

                DOWN: begin
                    key_flag <= 1'b0;
                    if (key_in_pedge) begin
                        state <= FILTER1;
                        en_cnt <= 1'b1;
                    end else begin
                        state <= DOWN;
                    end
                end

                FILTER1: begin
                    if (cnt_full) begin
                        state <= IDLE;
                        en_cnt <= 1'b0;
                    end else if (key_in_nedge) begin
                        en_cnt <= 1'b0;
                        state <= DOWN;
                    end else begin
                        state <= FILTER1;
                    end
                end

                default: begin 
                    state <= IDLE;
                    en_cnt <= 1'b0;
                    key_flag <= 1'b0;
                end
            endcase
        end
    end
    
    // 消抖计数器（20ms @ 50MHz）
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            cnt <= 20'd0;
        end else if (en_cnt) begin
            cnt <= cnt + 1'b1;
        end else begin
            cnt <= 20'd0;
        end
    end
    
    // 计数满标志
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            cnt_full <= 1'b0;
        end else if (cnt == 20'd999_999) begin  // 20ms
            cnt_full <= 1'b1;
        end else begin
            cnt_full <= 1'b0;
        end
    end

endmodule
