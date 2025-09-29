#!/usr/bin/env python3
"""
打开HTML报告
"""
import webbrowser
import os
import glob

def open_latest_html_report():
    """打开最新的HTML报告"""
    # 查找最新的HTML报告文件
    html_files = glob.glob("iis_log_report_*.html")
    if not html_files:
        print("没有找到HTML报告文件")
        return
    
    # 获取最新的文件
    latest_file = max(html_files, key=os.path.getctime)
    
    # 获取完整路径
    full_path = os.path.abspath(latest_file)
    
    print(f"正在打开HTML报告: {latest_file}")
    
    # 在默认浏览器中打开
    webbrowser.open(f"file://{full_path}")

if __name__ == "__main__":
    open_latest_html_report()