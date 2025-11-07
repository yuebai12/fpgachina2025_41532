`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// UART图像帧接收模块（集成UART接收器）
// 功能：
//   1. 从 uart_rx 引脚直接接收 UART 数据（9600波特率，8N1）
//   2. 解析图像帧格式：[0xAA][XH][XL][YH][YL][PIX][SUM][0x55]
//   3. 输出 x_data, y_data, pixel, frame_valid
//////////////////////////////////////////////////////////////////////////////////

module uart_rx_image #(
    parameter CLK_FREQ  = 50_000_000,   // 系统时钟频率
    parameter BAUD_RATE = 9600          // UART波特率
)(
    input  wire        clk,             // 系统时钟 50MHz
    input  wire        reset_n,         // 异步复位，低电平有效
    input  wire        uart_rx,         // UART接收引脚

    output reg  [15:0] x_data,          // X坐标输出
    output reg  [15:0] y_data,          // Y坐标输出
    output reg  [7:0]  pixel,           // 像素灰度或激光强度
    output reg         frame_valid      // 一帧数据接收完成标志
);

    // ============================================================
    // UART接收器参数计算
    // ============================================================
    localparam integer BAUD_CNT_MAX  = CLK_FREQ / BAUD_RATE;
    localparam integer BAUD_CNT_HALF = BAUD_CNT_MAX / 2;

    // ============================================================
    // UART接收器状态定义
    // ============================================================
    localparam [1:0]
        UART_IDLE  = 2'b00,
        UART_START = 2'b01,
        UART_DATA  = 2'b10,
        UART_STOP  = 2'b11;

    // ============================================================
    // 帧解析状态定义
    // ============================================================
    localparam [2:0]
        FRAME_IDLE = 3'd0,
        FRAME_RECV = 3'd1,
        FRAME_DONE = 3'd2;

    // ============================================================
    // UART接收器内部信号
    // ============================================================
    reg [1:0]  uart_state;
    reg [15:0] baud_cnt;
    reg [2:0]  bit_cnt;
    reg [7:0]  rx_byte_temp;
    reg [7:0]  rx_byte;
    reg        rx_done;
    
    // RX信号同步（防止亚稳态）
    reg rx_sync1, rx_sync2;

    // ============================================================
    // 帧解析器内部信号
    // ============================================================
    reg  [2:0] frame_state;
    reg  [7:0] rx_buf [1:7];
    reg  [3:0] byte_cnt;
    reg  [7:0] checksum;
    reg  [1:0] valid_cnt;

    // ============================================================
    // 第一部分：UART接收器（从 uart_rx 引脚接收字节）
    // ============================================================
    
    // RX信号同步化
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            rx_sync1 <= 1'b1;
            rx_sync2 <= 1'b1;
        end else begin
            rx_sync1 <= uart_rx;
            rx_sync2 <= rx_sync1;
        end
    end

    // UART接收状态机
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            uart_state   <= UART_IDLE;
            baud_cnt     <= 16'd0;
            bit_cnt      <= 3'd0;
            rx_byte      <= 8'd0;
            rx_byte_temp <= 8'd0;
            rx_done      <= 1'b0;
        end else begin
            rx_done <= 1'b0;  // 默认清除
            
            case (uart_state)
                // 空闲状态：等待起始位
                UART_IDLE: begin
                    baud_cnt <= 16'd0;
                    bit_cnt  <= 3'd0;
                    if (!rx_sync2) begin
                        uart_state <= UART_START;
                    end
                end
                
                // 起始位状态：等到中间位置采样
                UART_START: begin
                    if (baud_cnt >= BAUD_CNT_HALF - 1) begin
                        if (!rx_sync2) begin
                            baud_cnt   <= 16'd0;
                            uart_state <= UART_DATA;
                        end else begin
                            uart_state <= UART_IDLE;
                        end
                    end else begin
                        baud_cnt <= baud_cnt + 1'b1;
                    end
                end
                
                // 数据位状态：接收8位数据
                UART_DATA: begin
                    if (baud_cnt >= BAUD_CNT_MAX - 1) begin
                        baud_cnt <= 16'd0;
                        rx_byte_temp <= {rx_sync2, rx_byte_temp[7:1]};
                        bit_cnt <= bit_cnt + 1'b1;
                        
                        if (bit_cnt == 3'd7) begin
                            uart_state <= UART_STOP;
                        end
                    end else begin
                        baud_cnt <= baud_cnt + 1'b1;
                    end
                end
                
                // 停止位状态
                UART_STOP: begin
                    if (baud_cnt >= BAUD_CNT_MAX - 1) begin
                        if (rx_sync2) begin
                            rx_byte <= rx_byte_temp;
                            rx_done <= 1'b1;
                        end
                        uart_state <= UART_IDLE;
                    end else begin
                        baud_cnt <= baud_cnt + 1'b1;
                    end
                end
                
                default: uart_state <= UART_IDLE;
            endcase
        end
    end

    // ============================================================
    // 第二部分：帧解析器（解析图像帧数据）
    // ============================================================
    
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            frame_state <= FRAME_IDLE;
            byte_cnt    <= 4'd0;
            checksum    <= 8'd0;
            frame_valid <= 1'b0;
            valid_cnt   <= 2'd0;
            x_data      <= 16'd0;
            y_data      <= 16'd0;
            pixel       <= 8'd0;
            rx_buf[1]   <= 8'd0;
            rx_buf[2]   <= 8'd0;
            rx_buf[3]   <= 8'd0;
            rx_buf[4]   <= 8'd0;
            rx_buf[5]   <= 8'd0;
            rx_buf[6]   <= 8'd0;
            rx_buf[7]   <= 8'd0;
        end else begin
            frame_valid <= 1'b0;

            case (frame_state)
                //--------------------------------------------------
                // 等待帧头 0xAA
                //--------------------------------------------------
                FRAME_IDLE: begin
                    if (rx_done && rx_byte == 8'hAA) begin
                        byte_cnt    <= 4'd1;
                        checksum    <= 8'd0;
                        frame_state <= FRAME_RECV;
                    end
                end

                //--------------------------------------------------
                // 接收帧数据
                //--------------------------------------------------
                FRAME_RECV: begin
                    if (rx_done) begin
                        // 存储数据到缓冲区（索引1-7）
                        if (byte_cnt >= 4'd1 && byte_cnt <= 4'd7) begin
                            rx_buf[byte_cnt] <= rx_byte;
                        end
                        
                        byte_cnt <= byte_cnt + 1'b1;

                        // 累加校验值（只累加索引1-5的数据）
                        if (byte_cnt >= 4'd1 && byte_cnt <= 4'd5) begin
                            checksum <= checksum + rx_byte;
                        end

                        // 接收完整8字节
                        if (byte_cnt == 4'd7) begin
                            frame_state <= FRAME_DONE;
                        end
                    end
                end

                //--------------------------------------------------
                // 校验帧尾并输出数据
                //--------------------------------------------------
                FRAME_DONE: begin
                    // 验证帧尾0x55和校验和
                    if (rx_buf[7] == 8'h55 && rx_buf[6] == checksum) begin
                        x_data      <= {rx_buf[1], rx_buf[2]};
                        y_data      <= {rx_buf[3], rx_buf[4]};
                        pixel       <= rx_buf[5];
                        frame_valid <= 1'b1;
                        valid_cnt   <= 2'd2;
                    end
                    // 返回等待状态
                    frame_state <= FRAME_IDLE;
                    byte_cnt    <= 4'd0;
                    checksum    <= 8'd0;
                end

                default: begin
                    frame_state <= FRAME_IDLE;
                    byte_cnt    <= 4'd0;
                    checksum    <= 8'd0;
                end
            endcase

            //------------------------------------------------------
            // 延长 frame_valid 持续时间（2个时钟周期）
            //------------------------------------------------------
            if (valid_cnt != 0) begin
                valid_cnt   <= valid_cnt - 1'b1;
                frame_valid <= 1'b1;
            end
        end
    end

endmodule
