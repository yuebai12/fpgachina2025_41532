`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 2025/10/08 14:17:36
// Design Name: 
// Module Name: clock_div
// Project Name: 
// Target Devices: 
// Tool Versions: 
// Description: 
// 
// Dependencies: 
// 
// Revision:
// Revision 0.01 - File Created
// Additional Comments:
// 
//////////////////////////////////////////////////////////////////////////////////
module stepper_ctrl (
    input clk,              // 系统时钟
    input reset_n,          // 复位信号（低电平有效）
    input data_ready,       // 数据传输完成标志（开始运动）
    input [11:0] start_x,   // 起始X坐标
    input [11:0] start_y,   // 起始Y坐标  
    input [11:0] target_x,  // 目标X坐标
    input [11:0] target_y,  // 目标Y坐标
    
    // TMC2209控制信号
    output reg step_x,      // X轴步进脉冲
    output reg dir_x,       // X轴方向
    output reg step_y,      // Y轴步进脉冲  
    output reg dir_y,       // Y轴方向
    output reg motor_en,    // 电机使能信号（低电平有效）
    
    // 状态输出
    output reg busy,        // 忙信号
    output reg done         // 完成信号
);

// ============================================================================
// 参数定义
// ============================================================================

// 状态机状态定义
localparam [2:0] IDLE      = 3'b000;  // 空闲状态
localparam [2:0] ENABLE    = 3'b001;  // 使能状态
localparam [2:0] SETUP     = 3'b010;  // 设置状态
localparam [2:0] MOVE      = 3'b011;  // 运动状态
localparam [2:0] DISABLE   = 3'b100;  // 禁用状态

// 速度控制参数
localparam [15:0] SPEED_DIV = 16'd500;  // 速度分频系数

// ============================================================================
// 内部信号定义
// ============================================================================

reg [11:0] abs_dx, abs_dy;     // X和Y方向的绝对距离
reg [12:0] error;              // Bresenham算法的误差项
reg [11:0] steps_remaining;    // 剩余步数
reg [2:0] state;               // 状态机当前状态
reg [15:0] speed_counter;      // 速度分频计数器
reg speed_tick;                // 步进时钟脉冲
reg [7:0] enable_delay;        // 使能/禁用延迟计数器

// 显式线网声明
wire [11:0] abs_dx_calc, abs_dy_calc;  // 组合逻辑计算的绝对距离

// ============================================================================
// 组合逻辑 - 绝对距离计算
// ============================================================================

// 计算X和Y方向的绝对距离
assign abs_dx_calc = (target_x >= start_x) ? (target_x - start_x) : (start_x - target_x);
assign abs_dy_calc = (target_y >= start_y) ? (target_y - start_y) : (start_y - target_y);

// ============================================================================
// 速度控制模块
// ============================================================================

// 速度控制：通过分频产生步进脉冲
always @(posedge clk or negedge reset_n) begin
    if (!reset_n) begin
        // 复位时清零计数器
        speed_counter <= 16'h0;
        speed_tick <= 1'b0;
    end else if (state == MOVE) begin
        // 只有在运动状态下才进行速度计数
        if (speed_counter >= (SPEED_DIV - 1)) begin
            // 达到分频值，产生步进脉冲
            speed_counter <= 16'h0;
            speed_tick <= 1'b1;
        end else begin
            // 继续计数，不产生脉冲
            speed_counter <= speed_counter + 16'h1;
            speed_tick <= 1'b0;
        end
    end else begin
        // 非运动状态时清零
        speed_counter <= 16'h0;
        speed_tick <= 1'b0;
    end
end

// ============================================================================
// 主状态机
// ============================================================================

always @(posedge clk or negedge reset_n) begin
    if (!reset_n) begin
        // 复位初始化所有寄存器
        step_x <= 1'b0;
        step_y <= 1'b0;
        dir_x <= 1'b0;
        dir_y <= 1'b0;
        motor_en <= 1'b1;    // 电机默认禁用（低电平使能）
        busy <= 1'b0;
        done <= 1'b0;
        state <= IDLE;
        abs_dx <= 12'h0;
        abs_dy <= 12'h0;
        error <= 13'h0;
        steps_remaining <= 12'h0;
        enable_delay <= 8'h0;
    end else begin
        // 默认值 - 确保步进脉冲只持续一个时钟周期
        step_x <= 1'b0;
        step_y <= 1'b0;
        done <= 1'b0;
        
        // 状态机
        case (state)
            IDLE: begin
                // 空闲状态：电机禁用，等待开始信号
                motor_en <= 1'b1;      // 禁用电机
                busy <= 1'b0;          // 不忙
                enable_delay <= 8'h0;  // 清零延迟计数器
                
                if (data_ready) begin
                    // 接收到数据就绪信号，转移到使能状态
                    state <= ENABLE;
                    busy <= 1'b1;      // 设置为忙状态
                end
            end
            
            ENABLE: begin
                // 电机使能状态：启用电机并等待稳定
                motor_en <= 1'b0;      // 使能电机（低电平有效）
                
                if (enable_delay >= 8'd10) begin
                    // 延迟足够时间后进入设置状态
                    enable_delay <= 8'h0;
                    state <= SETUP;
                end else begin
                    // 增加延迟计数
                    enable_delay <= enable_delay + 8'h1;
                end
            end
            
            SETUP: begin
                // 参数设置状态：初始化Bresenham算法参数
                
                // 使用预计算的绝对距离值
                abs_dx <= abs_dx_calc;
                abs_dy <= abs_dy_calc;
                
                // 方向计算：目标>起点为正方向(0)，否则为负方向(1)
                dir_x <= (target_x >= start_x) ? 1'b0 : 1'b1;
                dir_y <= (target_y >= start_y) ? 1'b0 : 1'b1;
                
                // Bresenham算法初始化
                if (abs_dx_calc > abs_dy_calc) begin
                    // X为主导轴：总步数为abs_dx，初始误差为abs_dx/2
                    error <= {1'b0, abs_dx_calc} >> 1;  // 除以2
                    steps_remaining <= abs_dx_calc;
                end else begin
                    // Y为主导轴：总步数为abs_dy，初始误差为abs_dy/2
                    error <= {1'b0, abs_dy_calc} >> 1;  // 除以2
                    steps_remaining <= abs_dy_calc;
                end
                
                // 进入运动状态
                state <= MOVE;
            end
            
            MOVE: begin
                // 运动状态：执行Bresenham算法生成步进脉冲
                if (speed_tick && (steps_remaining > 0)) begin
                    // 速度脉冲到达且有剩余步数
                    if (abs_dx > abs_dy) begin
                        // X为主导轴的情况
                        step_x <= 1'b1;                            // 总是移动X轴
                        error <= error - {1'b0, abs_dy};           // 误差减去dy
                        if (error[12]) begin                       // 检查误差是否变为负值（符号位）
                            step_y <= 1'b1;                        // 需要移动Y轴
                            error <= error + {1'b0, abs_dx};       // 误差加上dx进行修正
                        end
                    end else begin
                        // Y为主导轴的情况
                        step_y <= 1'b1;                            // 总是移动Y轴
                        error <= error - {1'b0, abs_dx};           // 误差减去dx
                        if (error[12]) begin                       // 检查误差是否变为负值（符号位）
                            step_x <= 1'b1;                        // 需要移动X轴
                            error <= error + {1'b0, abs_dy};       // 误差加上dy进行修正
                        end
                    end
                    steps_remaining <= steps_remaining - 12'h1;    // 减少剩余步数
                end
                
                // 检查是否完成所有步数
                if (steps_remaining == 0) begin
                    state <= DISABLE;  // 进入禁用状态
                end
            end
            
            DISABLE: begin
                // 禁用状态：运动完成，禁用电机
                busy <= 1'b0;      // 清除忙状态
                done <= 1'b1;      // 设置完成标志
                
                if (enable_delay >= 8'd20) begin
                    // 延迟足够时间后回到空闲状态
                    motor_en <= 1'b1;      // 禁用电机
                    enable_delay <= 8'h0;
                    state <= IDLE;
                end else begin
                    // 增加延迟计数
                    enable_delay <= enable_delay + 8'h1;
                end
            end
            
            default: begin
                // 默认情况：回到空闲状态
                state <= IDLE;
            end
        endcase
    end
end

endmodule
