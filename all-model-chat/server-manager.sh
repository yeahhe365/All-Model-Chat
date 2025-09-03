#!/bin/bash

# 服务器管理脚本

SERVER_PID_FILE="server.pid"
LOG_FILE="server.log"

start_server() {
    if [ -f "$SERVER_PID_FILE" ]; then
        echo "服务器可能已经在运行。如果需要重启，请先停止。"
        return 1
    fi
    
    echo "启动开发服务器..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$SERVER_PID_FILE"
    echo "服务器已启动，PID: $(cat $SERVER_PID_FILE)"
    echo "日志文件: $LOG_FILE"
    echo "访问地址: http://localhost:5173/"
}

stop_server() {
    if [ ! -f "$SERVER_PID_FILE" ]; then
        echo "服务器未运行或 PID 文件不存在。"
        return 1
    fi
    
    PID=$(cat "$SERVER_PID_FILE")
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "服务器已停止 (PID: $PID)"
    else
        echo "进程 $PID 不存在"
    fi
    rm -f "$SERVER_PID_FILE"
}

status_server() {
    if [ -f "$SERVER_PID_FILE" ]; then
        PID=$(cat "$SERVER_PID_FILE")
        if ps -p $PID > /dev/null; then
            echo "服务器正在运行 (PID: $PID)"
            echo "访问地址: http://localhost:5173/"
        else
            echo "服务器已停止，但 PID 文件仍然存在"
        fi
    else
        echo "服务器未运行"
    fi
}

logs_server() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "日志文件不存在: $LOG_FILE"
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 2
        start_server
        ;;
    status)
        status_server
        ;;
    logs)
        logs_server
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        echo "  start   - 启动服务器"
        echo "  stop    - 停止服务器"
        echo "  restart - 重启服务器"
        echo "  status  - 查看服务器状态"
        echo "  logs    - 查看服务器日志"
        exit 1
        ;;
esac