`timescale 1ns/1ps
//////////////////////////////////////////////////////////////////////////////////
// FPGA激光雕刻系统 - 顶层模块（使用集成UART的版本）
//////////////////////////////////////////////////////////////////////////////////

module main(
    // ========== 系统时钟和复位 ==========
    input  wire        clk,            // 系统时钟 50MHz
    input  wire        reset_n,        // 异步复位，低电平有效
    
    // ========== 4个按键输入 ==========
    input  wire        key_start,      // 启动/暂停按键
    input  wire        key_reset,      // 系统复位按键
    input  wire        key_stop,       // 急停按键
    input  wire        key_test,       //  UART接收引脚
    
    // ========== 步进电机输出接口 ==========
    output wire        motor_x_step,
    output wire        motor_x_dir,
    output wire        motor_y_step,
    output wire        motor_y_dir,
    output wire        motor_en,
    
    // ========== 激光PWM输出 ==========
    output wire        laser_pwm_out
);

    // ============================================================
    // 内部信号定义
    // ============================================================
    
    // 按键去抖后的信号
    wire key_start_flag;
    wire key_reset_flag;
    wire key_stop_flag;
    wire key_test_flag;
    
    // UART图像帧接收模块输出
    wire [15:0] x_data, y_data;
    wire [7:0]  pixel;
    wire        frame_valid;
    
    // 步进电机控制信号
    wire        step_busy, step_done;
    wire        data_ready;
    wire [11:0] start_x, start_y, target_x, target_y;
    
    // 激光控制信号
    wire        laser_en;
    wire [9:0]  laser_power;
    
    // 系统控制信号
    reg         run_en;
    reg         system_reset;
    reg         emergency;
    reg         test_mode;
    
    // 当前位置
    wire [11:0] cur_x, cur_y;
    wire        fsm_busy;

    // ============================================================
    // 系统复位信号组合
    // ============================================================
    wire combined_reset_n;
    assign combined_reset_n = reset_n & ~system_reset;

    // ============================================================
    // 按键控制逻辑
    // ============================================================
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            run_en       <= 1'b0;
            system_reset <= 1'b0;
            emergency    <= 1'b0;
            test_mode    <= 1'b0;
        end else begin
            system_reset <= 1'b0;
            
            if (key_stop_flag) begin
                emergency <= ~emergency;
                if (!emergency) run_en <= 1'b0;
            end
            else if (key_reset_flag) begin
                system_reset <= 1'b1;
                run_en       <= 1'b0;
                emergency    <= 1'b0;
                test_mode    <= 1'b0;
            end
            else if (key_start_flag && !emergency) begin
                run_en <= ~run_en;
            end
            else if (key_test_flag && !emergency) begin
                test_mode <= ~test_mode;
            end
        end
    end

    // ============================================================
    // 模块实例化
    // ============================================================

    // ---------- 1. 按键去抖模块（4个） ----------
    key_debounce u_key_start (
        .clk      (clk),
        .reset_n  (reset_n),
        .key_in   (key_start),
        .key_flag (key_start_flag)
    );
    
    key_debounce u_key_reset (
        .clk      (clk),
        .reset_n  (reset_n),
        .key_in   (key_reset),
        .key_flag (key_reset_flag)
    );
    
    key_debounce u_key_stop (
        .clk      (clk),
        .reset_n  (reset_n),
        .key_in   (key_stop),
        .key_flag (key_stop_flag)
    );
    
    key_debounce u_key_test (
        .clk      (clk),
        .reset_n  (reset_n),
        .key_in   (key_test),
        .key_flag (key_test_flag)
    );

    // ---------- 2. 激光图像帧接收模块（集成UART接收器） ----------
    uart_rx_image #(
        .CLK_FREQ  (50_000_000),
        .BAUD_RATE (9600)
    ) u_rx_image (
        .clk         (clk),
        .reset_n     (combined_reset_n),
        .uart_rx     (uart_rx),          // 直接连接UART引脚
        .x_data      (x_data),
        .y_data      (y_data),
        .pixel       (pixel),
        .frame_valid (frame_valid)
    );

    // ---------- 3. 运动+雕刻协议状态机 ----------
    move_fsm u_fsm (
        .clk         (clk),
        .reset_n     (combined_reset_n),
        .run_en      (run_en && !emergency),
        .x_in        (x_data),
        .y_in        (y_data),
        .pixel       (pixel),
        .frame_valid (frame_valid),
        .data_ready  (data_ready),
        .start_x     (start_x),
        .start_y     (start_y),
        .target_x    (target_x),
        .target_y    (target_y),
        .step_busy   (step_busy),
        .step_done   (step_done),
        .laser_en    (laser_en),
        .laser_power (laser_power),
        .cur_x       (cur_x),
        .cur_y       (cur_y),
        .busy        (fsm_busy)
    );

    // ---------- 4. 步进电机控制模块 ----------
    stepper_ctrl u_stepper (
        .clk        (clk),
        .reset_n    (combined_reset_n),
        .data_ready (data_ready && !emergency),
        .start_x    (start_x),
        .start_y    (start_y),
        .target_x   (target_x),
        .target_y   (target_y),
        .step_x     (motor_x_step),
        .dir_x      (motor_x_dir),
        .step_y     (motor_y_step),
        .dir_y      (motor_y_dir),
        .motor_en   (motor_en),
        .busy       (step_busy),
        .done       (step_done)
    );

    // ---------- 5. 激光控制模块 ----------
    laser_ctrl u_laser (
        .clk          (clk),
        .reset_n      (combined_reset_n),
        .laser_en     (laser_en && !emergency),
        .laser_power  (test_mode ? 10'd512 : laser_power),
        .laser_pwm_out(laser_pwm_out)
    );

endmodule
