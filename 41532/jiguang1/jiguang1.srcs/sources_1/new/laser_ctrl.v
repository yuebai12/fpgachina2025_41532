`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 周
// 
// Create Date: 2025/10/08
// Design Name: LASER_CTRL
// Module Name: laser_ctrl
// Project Name: FPGA 激光雕刻系统
// Description: 封装 pwm_gen 模块的激光控制模块
//////////////////////////////////////////////////////////////////////////////////

module laser_ctrl #(
    parameter CLK_FREQ = 50_000_000,   // 系统时钟频率 50MHz
    parameter PWM_FREQ = 10_000        // 默认 PWM 频率 10kHz（可调）
)(
    input  wire        clk,            // 系统时钟
    input  wire        reset_n,        // 低电平复位
    input  wire        laser_en,       // 激光使能信号
    input  wire [9:0]  laser_power,    // 激光功率（0~1023）
    output wire        laser_pwm_out   // PWM 输出信号
);

    wire reset = ~reset_n;

    //---------------------------------------------
    // 计算 PWM 相关参数
    //---------------------------------------------
    localparam integer PWM_PERIOD = CLK_FREQ / PWM_FREQ;  // 周期计数值（例如 50M/10k = 5000）

    reg [31:0] counter_arr;
    reg [31:0] counter_ccr;

    always @(*) begin
        counter_arr = PWM_PERIOD;
        // 根据功率计算占空比
        // 10位输入对应 0~100% 占空比
        counter_ccr = (laser_power * PWM_PERIOD) / 1023;
    end

    //---------------------------------------------
    // 实例化 pwm_gen 模块
    //---------------------------------------------
    pwm_gen pwm_inst (
        .clk(clk),
        .reset_n(reset_n),
        .pwm_gen_en(laser_en),         // 当 laser_en=1 时开始输出
        .counter_arr(counter_arr),
        .counter_ccr(counter_ccr),
        .pwm_out(laser_pwm_out)
    );

endmodule
