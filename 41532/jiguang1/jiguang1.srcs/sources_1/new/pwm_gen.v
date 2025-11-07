`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 2025/10/08 14:17:36
// Design Name: 
// Module Name: pwm_gen
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
module pwm_gen(
	clk,   
	reset_n,
  
	pwm_gen_en,
	counter_arr,
	counter_ccr,
	pwm_out
);
    
	input clk;	     //系统时钟输入，50M
	input reset_n;	   //复位信号输入，低有效
	input  pwm_gen_en;	 //pwm产生使能信号
	input [31:0]counter_arr; //输入32位预重装值
	input [31:0]counter_ccr; //输入32位输出比较值
	output pwm_out;	   //pwm输出信号
	
    wire reset;
	assign reset=~reset_n;
	
	reg  pwm_out;
	reg [31:0]pwm_gen_cnt;   //定义32位产生pwm的计数器
   
    /*使用教程：使用该模块需先定义counter_arr和counter_ccr，
    ???????_??? = PW × ?????e?_???
    eg:counter_arr = 1000; //设置输出信号频率为 50KHz
    counter_ccr = 400; //设置输出 PWM 波占空比为 40%
    */


	always@(posedge clk or posedge reset)
	if(reset)
		pwm_gen_cnt <= 32'd1;
	else if(pwm_gen_en)
	begin
		if(pwm_gen_cnt <= 32'd1)
			pwm_gen_cnt <= counter_arr;       //计数减到1，加载预重装寄存器值
		else
			pwm_gen_cnt <= pwm_gen_cnt - 1'b1;//计数器自减1
	end
	else
		pwm_gen_cnt <= counter_arr;	        //未使能时，计数器值等于预重装寄存器值

	always@(posedge clk or posedge reset)
	if(reset)                          //复位时，PWM输出低电平
		pwm_out <= 1'b0;
	else if(pwm_gen_cnt <= counter_ccr)   //计数值小于比较值，PWM输出高电平
		pwm_out <= 1'b1;
	else
		pwm_out <= 1'b0;                    //计数值大于比较值，PWM输出低电平
		
endmodule