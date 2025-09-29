#!/usr/bin/env python3
"""
简化的IIS日志分析测试
"""

import os
import glob

def main():
    # 检查日志文件目录
    log_dir = '.'
    
    # 查找日志文件
    web_logs = []
    ftp_logs = []
    
    for service_dir in ['W3SVC2', 'W3SVC3', 'W3SVC5', 'W3SVC6', 'W3SVC7']:
        pattern = os.path.join(log_dir, service_dir, '*.log')
        files = glob.glob(pattern)
        web_logs.extend(files)
        print(f"发现 {service_dir}: {len(files)} 个日志文件")
    
    for service_dir in ['FTPSVC4']:
        pattern = os.path.join(log_dir, service_dir, '*.log')
        files = glob.glob(pattern)
        ftp_logs.extend(files)
        print(f"发现 {service_dir}: {len(files)} 个日志文件")
    
    print(f"\n总计: Web日志 {len(web_logs)} 个文件, FTP日志 {len(ftp_logs)} 个文件")
    
    if web_logs or ftp_logs:
        print("日志文件发现正常，可以继续分析")
    else:
        print("未找到日志文件")

if __name__ == "__main__":
    main()