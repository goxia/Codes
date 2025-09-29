#!/usr/bin/env python3
"""
IIS日志分析工具
分析IIS Web服务器和FTP服务器的日志文件
"""

import os
import re
from collections import defaultdict, Counter
from datetime import datetime
import glob
from urllib.parse import unquote
import json
import requests
import time
import ipaddress
import ipaddress

class IISLogAnalyzer:
    def __init__(self, log_directory):
        self.log_directory = log_directory
        self.web_logs = []
        self.ftp_logs = []
        self.ip_location_cache = {}
        
    def load_logs(self):
        """加载所有日志文件"""
        print("正在加载日志文件...")
        
        # 加载Web服务日志 (W3SVC*)
        for service_dir in glob.glob(os.path.join(self.log_directory, "W3SVC*")):
            service_name = os.path.basename(service_dir)
            for log_file in glob.glob(os.path.join(service_dir, "*.log")):
                self._parse_web_log(log_file, service_name)
        
        # 加载FTP服务日志 (FTPSVC*)
        for service_dir in glob.glob(os.path.join(self.log_directory, "FTPSVC*")):
            service_name = os.path.basename(service_dir)
            for log_file in glob.glob(os.path.join(service_dir, "*.log")):
                self._parse_ftp_log(log_file, service_name)
        
        print(f"已加载 {len(self.web_logs)} 条Web日志记录")
        print(f"已加载 {len(self.ftp_logs)} 条FTP日志记录")
    
    def _parse_web_log(self, log_file, service_name):
        """解析Web服务日志"""
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('#') or not line:
                        continue
                    
                    fields = line.split(' ')
                    if len(fields) >= 14:
                        try:
                            log_entry = {
                                'service': service_name,
                                'date': fields[0],
                                'time': fields[1],
                                'server_ip': fields[2],
                                'method': fields[3],
                                'uri_stem': unquote(fields[4]),
                                'uri_query': fields[5] if fields[5] != '-' else '',
                                'port': fields[6],
                                'username': fields[7] if fields[7] != '-' else '',
                                'client_ip': fields[8],
                                'user_agent': unquote(fields[9].replace('+', ' ')),
                                'referer': unquote(fields[10]) if fields[10] != '-' else '',
                                'status_code': fields[11],
                                'substatus': fields[12],
                                'win32_status': fields[13],
                                'time_taken': fields[14] if len(fields) > 14 else '0'
                            }
                            self.web_logs.append(log_entry)
                        except Exception as e:
                            continue
        except Exception as e:
            print(f"读取文件 {log_file} 时出错: {e}")
    
    def _parse_ftp_log(self, log_file, service_name):
        """解析FTP服务日志"""
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('#') or not line:
                        continue
                    
                    fields = line.split(' ')
                    if len(fields) >= 12:
                        try:
                            log_entry = {
                                'service': service_name,
                                'date': fields[0],
                                'time': fields[1],
                                'client_ip': fields[2],
                                'username': fields[3] if fields[3] != '-' else '',
                                'server_ip': fields[4],
                                'port': fields[5],
                                'method': fields[6],
                                'uri_stem': fields[7] if fields[7] != '-' else '',
                                'status_code': fields[8] if fields[8] != '-' else '',
                                'win32_status': fields[9],
                                'substatus': fields[10],
                                'session_id': fields[11],
                                'full_path': fields[12] if len(fields) > 12 else ''
                            }
                            self.ftp_logs.append(log_entry)
                        except Exception as e:
                            continue
        except Exception as e:
            print(f"读取文件 {log_file} 时出错: {e}")
    
    def analyze_web_traffic(self):
        """分析Web流量"""
        print("\n=== Web流量分析 ===")
        
        if not self.web_logs:
            print("没有Web日志数据")
            return
        
        # 状态码分析
        status_codes = Counter(log['status_code'] for log in self.web_logs)
        print("\n状态码分布:")
        for code, count in status_codes.most_common():
            print(f"  {code}: {count} 次")
        
        # 最活跃的IP地址
        client_ips = Counter(log['client_ip'] for log in self.web_logs)
        print(f"\n最活跃的客户端IP (前10):")
        for ip, count in client_ips.most_common(10):
            print(f"  {ip}: {count} 次请求")
        
        # 最受欢迎的页面
        uri_stems = Counter(log['uri_stem'] for log in self.web_logs)
        print(f"\n最受访问的页面 (前10):")
        for uri, count in uri_stems.most_common(10):
            print(f"  {uri}: {count} 次")
        
        # 用户代理分析
        user_agents = Counter(log['user_agent'] for log in self.web_logs if log['user_agent'])
        print(f"\n主要用户代理 (前5):")
        for ua, count in user_agents.most_common(5):
            ua_short = ua[:80] + "..." if len(ua) > 80 else ua
            print(f"  {ua_short}: {count} 次")
        
        # 错误分析
        errors = [log for log in self.web_logs if log['status_code'].startswith('4') or log['status_code'].startswith('5')]
        if errors:
            print(f"\n错误请求分析 (总计 {len(errors)} 个错误):")
            error_uris = Counter(log['uri_stem'] for log in errors)
            for uri, count in error_uris.most_common(10):
                print(f"  {uri}: {count} 次错误")
    
    def analyze_security_threats(self):
        """分析安全威胁"""
        print("\n=== 安全威胁分析 ===")
        
        if not self.web_logs:
            print("没有Web日志数据")
            return
        
        threats = []
        
        # 检测常见攻击模式
        attack_patterns = [
            (r'\.\./', '目录遍历攻击'),
            (r'/\.env', '环境文件访问'),
            (r'/\.git/', 'Git文件访问'),
            (r'<script', 'XSS攻击尝试'),
            (r'union.*select', 'SQL注入尝试'),
            (r'/shell', 'Shell访问尝试'),
            (r'/cgi-bin/', 'CGI漏洞利用'),
            (r'wget|curl', '命令执行尝试'),
            (r'/admin|/wp-admin', '管理面板探测'),
            (r'/phpmyadmin', 'phpMyAdmin探测')
        ]
        
        for log in self.web_logs:
            uri = log['uri_stem'].lower()
            query = log['uri_query'].lower()
            ua = log['user_agent'].lower()
            
            for pattern, threat_type in attack_patterns:
                if re.search(pattern, uri) or re.search(pattern, query) or re.search(pattern, ua):
                    threats.append({
                        'ip': log['client_ip'],
                        'port': log['port'],
                        'uri': log['uri_stem'],
                        'threat_type': threat_type,
                        'date': log['date'],
                        'time': log['time'],
                        'user_agent': log['user_agent']
                    })
        
        if threats:
            print(f"检测到 {len(threats)} 个潜在安全威胁:")
            
            # 按威胁类型分组
            threat_types = Counter(threat['threat_type'] for threat in threats)
            for threat_type, count in threat_types.most_common():
                print(f"\n{threat_type}: {count} 次")
            
            # 最危险的IP
            threat_ips = Counter(threat['ip'] for threat in threats)
            print(f"\n最危险的IP地址 (前10):")
            for ip, count in threat_ips.most_common(10):
                print(f"  {ip}: {count} 次威胁行为")
        else:
            print("未检测到明显的安全威胁")
    
    def analyze_ftp_activity(self):
        """分析FTP活动"""
        print("\n=== FTP活动分析 ===")
        
        if not self.ftp_logs:
            print("没有FTP日志数据")
            return
        
        # 连接统计
        connections = [log for log in self.ftp_logs if 'ControlChannelOpened' in log['method']]
        print(f"FTP连接总数: {len(connections)}")
        
        # 客户端IP分析
        client_ips = Counter(log['client_ip'] for log in connections)
        print(f"\nFTP客户端IP (前10):")
        for ip, count in client_ips.most_common(10):
            print(f"  {ip}: {count} 次连接")
        
        # 认证尝试
        auth_attempts = [log for log in self.ftp_logs if 'AUTH' in log['method']]
        print(f"\n认证尝试: {len(auth_attempts)} 次")
        
        # 错误连接
        error_connections = [log for log in self.ftp_logs if log['status_code'] and not log['status_code'].startswith('2')]
        if error_connections:
            print(f"\n错误连接: {len(error_connections)} 次")
            error_ips = Counter(log['client_ip'] for log in error_connections)
            for ip, count in error_ips.most_common(5):
                print(f"  {ip}: {count} 次错误")
    
    def analyze_ip_port_access(self):
        """分析IP地址的端口访问模式"""
        print("\n=== IP端口访问分析 ===")
        
        if not self.web_logs and not self.ftp_logs:
            print("没有日志数据")
            return
        
        # 收集所有IP的端口访问信息
        ip_port_access = defaultdict(lambda: defaultdict(int))
        ip_total_requests = defaultdict(int)
        
        # Web日志端口分析
        for log in self.web_logs:
            ip = log['client_ip']
            port = log['port']
            ip_port_access[ip][f"Web-{port}"] += 1
            ip_total_requests[ip] += 1
        
        # FTP日志端口分析
        for log in self.ftp_logs:
            ip = log['client_ip']
            port = log['port']
            ip_port_access[ip][f"FTP-{port}"] += 1
            ip_total_requests[ip] += 1
        
        # 获取最活跃的IP (前20)
        top_ips = [ip for ip, count in Counter(ip_total_requests).most_common(20)]
        
        print("最活跃IP的端口访问模式 (前20):")
        print("-" * 80)
        
        for ip in top_ips:
            total_requests = ip_total_requests[ip]
            ports = ip_port_access[ip]
            
            print(f"\n{ip} (总请求: {total_requests})")
            # 按请求数排序端口
            sorted_ports = sorted(ports.items(), key=lambda x: x[1], reverse=True)
            for port_service, count in sorted_ports:
                percentage = (count / total_requests) * 100
                print(f"  {port_service}: {count} 次 ({percentage:.1f}%)")
        
        # 分析端口使用统计
        print(f"\n端口使用统计:")
        all_ports = defaultdict(int)
        for ip_ports in ip_port_access.values():
            for port_service, count in ip_ports.items():
                all_ports[port_service] += count
        
        for port_service, total_count in sorted(all_ports.items(), key=lambda x: x[1], reverse=True):
            print(f"  {port_service}: {total_count} 次访问")
    
    def print_subnet_analysis(self):
        """输出子网攻击分析结果"""
        if not hasattr(self, 'analysis_data') or 'subnet_attacks' not in self.analysis_data:
            return
        
        subnet_data = self.analysis_data['subnet_attacks']
        if not subnet_data:
            return
        
        print("\n=== 🚨 子网攻击分析 ===")
        print(f"检测到 {len(subnet_data)} 个可疑子网（高活跃度C类网段）\n")
        
        for i, (subnet, data) in enumerate(sorted(subnet_data.items(), 
                                                key=lambda x: x[1]['total_requests'], 
                                                reverse=True)[:5], 1):  # 只显示前5个
            print(f"� 子网 #{i}: {subnet}/24")
            print(f"  📊 {data['ip_count']} 个IP，总请求 {data['total_requests']:,} 次，平均 {data['avg_requests_per_ip']:.0f} 次/IP")
            print(f"  📍 示例IP: {', '.join(data['sample_ips'])}")
            
            # 判断风险等级
            if data['avg_requests_per_ip'] > 5000:
                print(f"  ⚠️ 高风险：可能的僵尸网络或大规模攻击")
            elif data['ip_count'] > 20:
                print(f"  ⚠️ 中风险：分布式访问，需要关注")
            else:
                print(f"  ✅ 低风险：可能是正常的业务流量")
            print()
            
            print()

    def analyze_high_risk_ips(self):
        """详细分析高风险IP的行为模式"""
        print("\n=== 高风险IP详细分析 ===")
        
        # 获取高流量IP (前10个)
        web_top_ips = Counter(log['client_ip'] for log in self.web_logs).most_common(10)
        
        # 分析安全威胁IP
        threats = []
        attack_patterns = [
            (r'\.\./', '目录遍历攻击'),
            (r'/\.env', '环境文件访问'),
            (r'/\.git/', 'Git文件访问'),
            (r'/shell', 'Shell访问尝试'),
            (r'/cgi-bin/', 'CGI漏洞利用'),
            (r'wget|curl', '命令执行尝试'),
            (r'/admin|/wp-admin', '管理面板探测'),
            (r'/phpmyadmin', 'phpMyAdmin探测')
        ]
        
        for log in self.web_logs:
            uri = log['uri_stem'].lower()
            query = log['uri_query'].lower()
            ua = log['user_agent'].lower()
            
            for pattern, threat_type in attack_patterns:
                if re.search(pattern, uri) or re.search(pattern, query) or re.search(pattern, ua):
                    threats.append(log['client_ip'])
        
        threat_ips = Counter(threats).most_common(10)
        
        # 合并高风险IP列表 - 包含所有高流量IP
        high_risk_ips = set()
        for ip, _ in web_top_ips:  # 包含所有前10个高流量IP
            high_risk_ips.add(ip)
        for ip, _ in threat_ips[:10]:   # 前10个高威胁IP
            high_risk_ips.add(ip)
        
        print(f"分析 {len(high_risk_ips)} 个高风险IP的详细行为:")
        print(f"包括前10个高流量IP和前10个高威胁IP")
        print("-" * 80)
        
        for ip in high_risk_ips:
            print(f"\n🔍 IP地址: {ip}")
            
            # Web访问分析
            web_requests = [log for log in self.web_logs if log['client_ip'] == ip]
            if web_requests:
                print(f"  Web访问: {len(web_requests)} 次")
                
                # 端口分析
                ports = Counter(log['port'] for log in web_requests)
                print(f"  访问端口: {dict(ports)}")
                
                # 状态码分析
                status_codes = Counter(log['status_code'] for log in web_requests)
                print(f"  状态码: {dict(status_codes)}")
                
                # 访问的页面
                top_pages = Counter(log['uri_stem'] for log in web_requests).most_common(5)
                print(f"  主要访问页面:")
                for page, count in top_pages:
                    print(f"    {page}: {count} 次")
            
            # FTP访问分析
            ftp_requests = [log for log in self.ftp_logs if log['client_ip'] == ip]
            if ftp_requests:
                print(f"  FTP连接: {len(ftp_requests)} 次")
                ftp_ports = Counter(log['port'] for log in ftp_requests)
                print(f"  FTP端口: {dict(ftp_ports)}")

    def collect_analysis_data(self):
        """收集所有分析数据"""
        self.analysis_data = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'summary': {
                'web_logs_count': len(self.web_logs),
                'ftp_logs_count': len(self.ftp_logs),
                'total_logs_count': len(self.web_logs) + len(self.ftp_logs)
            },
            'web_traffic': self._get_web_traffic_data(),
            'security_threats': self._get_security_threats_data(),
            'ftp_activity': self._get_ftp_activity_data(),
            'ip_port_access': self._get_ip_port_access_data(),
            'high_risk_ips': self._get_high_risk_ips_data(),
            'subnet_attacks': self.analyze_subnet_attacks()
        }
    
    def _get_web_traffic_data(self):
        """获取Web流量数据"""
        if not self.web_logs:
            return {}
        
        status_codes = Counter(log['status_code'] for log in self.web_logs)
        client_ips = Counter(log['client_ip'] for log in self.web_logs)
        uri_stems = Counter(log['uri_stem'] for log in self.web_logs)
        user_agents = Counter(log['user_agent'] for log in self.web_logs if log['user_agent'])
        errors = [log for log in self.web_logs if log['status_code'].startswith('4') or log['status_code'].startswith('5')]
        error_uris = Counter(log['uri_stem'] for log in errors)
        
        return {
            'status_codes': dict(status_codes.most_common()),
            'top_client_ips': dict(client_ips.most_common(10)),
            'top_pages': dict(uri_stems.most_common(10)),
            'top_user_agents': dict(user_agents.most_common(5)),
            'error_count': len(errors),
            'top_error_pages': dict(error_uris.most_common(10))
        }
    
    def _get_security_threats_data(self):
        """获取安全威胁数据"""
        if not self.web_logs:
            return {}
        
        threats = []
        attack_patterns = [
            (r'\.\./', '目录遍历攻击'),
            (r'/\.env', '环境文件访问'),
            (r'/\.git/', 'Git文件访问'),
            (r'<script', 'XSS攻击尝试'),
            (r'union.*select', 'SQL注入尝试'),
            (r'/shell', 'Shell访问尝试'),
            (r'/cgi-bin/', 'CGI漏洞利用'),
            (r'wget|curl', '命令执行尝试'),
            (r'/admin|/wp-admin', '管理面板探测'),
            (r'/phpmyadmin', 'phpMyAdmin探测')
        ]
        
        for log in self.web_logs:
            uri = log['uri_stem'].lower()
            query = log['uri_query'].lower()
            ua = log['user_agent'].lower()
            
            for pattern, threat_type in attack_patterns:
                if re.search(pattern, uri) or re.search(pattern, query) or re.search(pattern, ua):
                    threats.append({
                        'ip': log['client_ip'],
                        'port': log['port'],
                        'uri': log['uri_stem'],
                        'threat_type': threat_type,
                        'date': log['date'],
                        'time': log['time']
                    })
        
        threat_types = Counter(threat['threat_type'] for threat in threats)
        threat_ips = Counter(threat['ip'] for threat in threats)
        
        return {
            'total_threats': len(threats),
            'threat_types': dict(threat_types.most_common()),
            'dangerous_ips': dict(threat_ips.most_common(10)),
            'threat_details': threats[:50]  # 只保留前50个详细记录
        }
    
    def _get_ftp_activity_data(self):
        """获取FTP活动数据"""
        if not self.ftp_logs:
            return {}
        
        connections = [log for log in self.ftp_logs if 'ControlChannelOpened' in log['method']]
        client_ips = Counter(log['client_ip'] for log in connections)
        auth_attempts = [log for log in self.ftp_logs if 'AUTH' in log['method']]
        error_connections = [log for log in self.ftp_logs if log['status_code'] and not log['status_code'].startswith('2')]
        error_ips = Counter(log['client_ip'] for log in error_connections)
        
        return {
            'total_connections': len(connections),
            'top_client_ips': dict(client_ips.most_common(10)),
            'auth_attempts': len(auth_attempts),
            'error_connections': len(error_connections),
            'error_ips': dict(error_ips.most_common(5))
        }
    
    def _get_ip_port_access_data(self):
        """获取IP端口访问数据"""
        ip_port_access = defaultdict(lambda: defaultdict(int))
        ip_total_requests = defaultdict(int)
        
        for log in self.web_logs:
            ip = log['client_ip']
            port = log['port']
            ip_port_access[ip][f"Web-{port}"] += 1
            ip_total_requests[ip] += 1
        
        for log in self.ftp_logs:
            ip = log['client_ip']
            port = log['port']
            ip_port_access[ip][f"FTP-{port}"] += 1
            ip_total_requests[ip] += 1
        
        # 获取前20个最活跃IP
        top_ips = [ip for ip, count in Counter(ip_total_requests).most_common(20)]
        
        # 端口统计
        all_ports = defaultdict(int)
        for ip_ports in ip_port_access.values():
            for port_service, count in ip_ports.items():
                all_ports[port_service] += count
        
        return {
            'top_ips': {ip: {'total': ip_total_requests[ip], 'ports': dict(ip_port_access[ip])} for ip in top_ips},
            'port_statistics': dict(sorted(all_ports.items(), key=lambda x: x[1], reverse=True))
        }
    
    def get_ip_location(self, ip):
        """获取IP地理位置信息（包含ISP、组织等详细信息）"""
        if ip in self.ip_location_cache:
            return self.ip_location_cache[ip]
        
        # 尝试多个IP查询服务
        services = [
            f"http://ip-api.com/json/{ip}?fields=country,regionName,city,isp,org,as,hosting",
            f"https://ipapi.co/{ip}/json/",
            f"http://ipinfo.io/{ip}/json"
        ]
        
        for service_url in services:
            try:
                response = requests.get(service_url, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    
                    # 处理不同API的响应格式
                    location_info = {}
                    if 'isp' in data and 'org' in data:  # ip-api.com format
                        location_info = {
                            'country': data.get('country', '未知'),
                            'region': data.get('regionName', ''),
                            'city': data.get('city', ''),
                            'isp': data.get('isp', ''),
                            'org': data.get('org', ''),
                            'as': data.get('as', ''),
                            'hosting': data.get('hosting', False)
                        }
                    elif 'country_name' in data:  # ipapi.co format
                        location_info = {
                            'country': data.get('country_name', '未知'),
                            'region': data.get('region', ''),
                            'city': data.get('city', ''),
                            'isp': data.get('org', ''),
                            'org': data.get('org', ''),
                            'as': '',
                            'hosting': False
                        }
                    else:  # ipinfo.io format
                        location_info = {
                            'country': data.get('country', '未知'),
                            'region': data.get('region', ''),
                            'city': data.get('city', ''),
                            'isp': data.get('org', ''),
                            'org': data.get('org', ''),
                            'as': '',
                            'hosting': False
                        }
                    
                    self.ip_location_cache[ip] = location_info
                    time.sleep(0.1)  # 避免请求过于频繁
                    return location_info
                    
            except Exception as e:
                continue
        
        # 如果所有服务都失败，返回默认值
        default_info = {'country': '未知', 'region': '', 'city': '', 'isp': '', 'org': '', 'as': '', 'hosting': False}
        self.ip_location_cache[ip] = default_info
        return default_info

    def analyze_subnet_attacks(self):
        """分析子网攻击模式 - 重点关注高风险子网"""
        # 预先统计IP访问次数
        web_ip_counts = Counter(log['client_ip'] for log in self.web_logs)
        ftp_ip_counts = Counter(log['client_ip'] for log in self.ftp_logs)
        
        # 收集所有IP地址
        all_ips = set(web_ip_counts.keys()) | set(ftp_ip_counts.keys())
        
        # 按/24子网分组IP
        subnet_groups = defaultdict(list)
        for ip_str in all_ips:
            try:
                ip = ipaddress.IPv4Address(ip_str)
                subnet_24 = ipaddress.IPv4Network(f"{ip}/24", strict=False).network_address
                subnet_groups[str(subnet_24)].append(ip_str)
            except:
                continue
        
        # 找到可疑子网 - 提高标准，重点关注真正异常的
        suspicious_subnets = {}
        for subnet, ips in subnet_groups.items():
            # 只关注IP数量多或访问量大的子网
            if len(ips) >= 5:  # 提高到5个IP以上
                total_requests = sum(web_ip_counts.get(ip, 0) + ftp_ip_counts.get(ip, 0) for ip in ips)
                avg_requests = total_requests / len(ips)
                
                # 只保留高活跃度的子网
                if avg_requests > 100:  # 平均每IP超过100次请求
                    suspicious_subnets[subnet] = {
                        'ip_count': len(ips),
                        'total_requests': total_requests,
                        'avg_requests_per_ip': avg_requests,
                        'sample_ips': sorted(ips, key=lambda x: ipaddress.IPv4Address(x))[:5]  # 只显示前5个IP作为样本
                    }
        
        return dict(sorted(suspicious_subnets.items(), 
                          key=lambda x: x[1]['total_requests'], 
                          reverse=True))

    def _get_high_risk_ips_data(self):
        """获取高风险IP数据 - 确保与最危险IP对应"""
        # 获取威胁IP数据 - 与analyze_security_threats一致
        threats = []
        attack_patterns = [
            (r'\.\./', '目录遍历攻击'), (r'/\.env', '环境文件访问'), (r'/\.git/', 'Git文件访问'),
            (r'<script', 'XSS攻击尝试'), (r'union.*select', 'SQL注入尝试'),
            (r'/shell', 'Shell访问尝试'), (r'/cgi-bin/', 'CGI漏洞利用'), (r'wget|curl', '命令执行尝试'),
            (r'/admin|/wp-admin', '管理面板探测'), (r'/phpmyadmin', 'phpMyAdmin探测')
        ]
        
        for log in self.web_logs:
            uri = log['uri_stem'].lower()
            query = log['uri_query'].lower()
            ua = log['user_agent'].lower()
            
            for pattern, threat_type in attack_patterns:
                if re.search(pattern, uri) or re.search(pattern, query) or re.search(pattern, ua):
                    threats.append(log['client_ip'])
        
        # 获取最危险的IP（与最危险IP地址列表完全一致）
        threat_ips = Counter(threats).most_common(10)
        
        # 获取高流量IP作为补充
        web_top_ips = Counter(log['client_ip'] for log in self.web_logs).most_common(10)
        
        # 优先包含最危险的威胁IP
        high_risk_ips = set()
        for ip, _ in threat_ips:  # 优先添加威胁IP
            high_risk_ips.add(ip)
        for ip, _ in web_top_ips:  # 补充高流量IP
            high_risk_ips.add(ip)
        
        # 收集每个高风险IP的详细信息
        high_risk_data = {}
        for ip in high_risk_ips:
            web_requests = [log for log in self.web_logs if log['client_ip'] == ip]
            ftp_requests = [log for log in self.ftp_logs if log['client_ip'] == ip]
            
            ip_data = {'ip': ip}
            
            if web_requests:
                ports = Counter(log['port'] for log in web_requests)
                status_codes = Counter(log['status_code'] for log in web_requests)
                top_pages = Counter(log['uri_stem'] for log in web_requests).most_common(5)
                
                ip_data['web'] = {
                    'requests': len(web_requests),
                    'ports': dict(ports),
                    'status_codes': dict(status_codes),
                    'top_pages': dict(top_pages)
                }
            
            if ftp_requests:
                ftp_ports = Counter(log['port'] for log in ftp_requests)
                ip_data['ftp'] = {
                    'connections': len(ftp_requests),
                    'ports': dict(ftp_ports)
                }
            
            high_risk_data[ip] = ip_data
        
        return high_risk_data

    def generate_html_report(self):
        """生成HTML格式报告"""
        print("正在获取IP地理位置信息...")
        # 获取所有需要显示的IP的地理位置信息
        print("正在获取IP地理位置信息...")
        
        # 最活跃的IP
        top_web_ips = list(self.analysis_data['web_traffic']['top_client_ips'].keys())[:10]
        for ip in top_web_ips:
            self.get_ip_location(ip)
        
        # 危险IP
        dangerous_ips = list(self.analysis_data['security_threats']['dangerous_ips'].keys())[:10]
        for ip in dangerous_ips:
            self.get_ip_location(ip)
        
        # FTP客户端IP
        ftp_client_ips = list(self.analysis_data['ftp_activity']['top_client_ips'].keys())[:10]
        for ip in ftp_client_ips:
            self.get_ip_location(ip)
        
        html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IIS日志分析报告</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; text-align: center; margin-bottom: 10px; }}
        h2 {{ color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        h3 {{ color: #2980b9; }}
        .summary {{ background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .summary-item {{ display: inline-block; margin: 10px 20px; }}
        .summary-number {{ font-size: 2em; font-weight: bold; color: #3498db; }}
        .summary-label {{ color: #7f8c8d; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #3498db; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        .threat-high {{ background-color: #e74c3c; color: white; }}
        .threat-medium {{ background-color: #f39c12; color: white; }}
        .threat-low {{ background-color: #f1c40f; }}
        .ip-address {{ font-family: monospace; font-weight: bold; cursor: pointer; color: #2980b9; }}
        .ip-address:hover {{ text-decoration: underline; background-color: #ecf0f1; }}
        .ip-address-inactive {{ font-family: monospace; font-weight: bold; color: #7f8c8d; }}
        .ip-location {{ font-size: 0.8em; color: #7f8c8d; font-style: italic; line-height: 1.4; }}
        .ip-location small {{ display: block; font-size: 0.8em; color: #95a5a6; }}
        .status-200 {{ color: #27ae60; }}
        .status-400 {{ color: #f39c12; }}
        .status-500 {{ color: #e74c3c; }}
        .port-web {{ color: #3498db; }}
        .port-ftp {{ color: #9b59b6; }}
        .section {{ margin: 30px 0; }}
        .detailed-analysis {{ margin-top: 40px; border-top: 2px solid #bdc3c7; padding-top: 20px; }}
        .ip-detail {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }}
        .navigation {{ position: fixed; top: 20px; right: 20px; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 1000; }}
        .nav-button {{ display: block; margin: 5px 0; padding: 5px 10px; background: #3498db; color: white; text-decoration: none; border-radius: 3px; font-size: 0.8em; }}
        .nav-button:hover {{ background: #2980b9; }}
        .top-button {{ position: fixed; bottom: 30px; right: 30px; background: #3498db; color: white; border: none; padding: 15px; border-radius: 50%; cursor: pointer; font-size: 1.2em; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 1001; display: none; }}
        .top-button:hover {{ background: #2980b9; }}
        .top-button.show {{ display: block; }}
    </style>
    <script>
        function scrollToIP(ip) {{
            const element = document.getElementById('detail-' + ip.replace(/\\./g, '-'));
            if (element) {{
                element.scrollIntoView({{ behavior: 'smooth' }});
                element.style.backgroundColor = '#ffffcc';
                setTimeout(() => {{ element.style.backgroundColor = '#f9f9f9'; }}, 2000);
            }} else {{
                // 如果找不到详细分析，提示用户
                alert('该IP地址不在详细分析列表中');
            }}
        }}
        
        function scrollToSection(sectionId) {{
            document.getElementById(sectionId).scrollIntoView({{ behavior: 'smooth' }});
        }}
        
        function scrollToSubnet(subnet) {{
            const element = document.getElementById('subnet-' + subnet.replace(/\./g, '-').replace(/\//g, '-'));
            if (element) {{
                element.scrollIntoView({{ behavior: 'smooth' }});
                element.style.backgroundColor = '#ffffcc';
                setTimeout(() => {{ element.style.backgroundColor = '#f9f9f9'; }}, 2000);
            }} else {{
                alert('子网详细信息未找到');
            }}
        }}
        
        function scrollToTop() {{
            window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}
        
        // 显示/隐藏返回顶部按钮
        window.onscroll = function() {{
            const topButton = document.getElementById('topButton');
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {{
                topButton.classList.add('show');
            }} else {{
                topButton.classList.remove('show');
            }}
        }}
    </script>
</head>
<body>
    <div class="navigation">
        <a href="#summary" class="nav-button">📊 概览</a>
        <a href="#security" class="nav-button">🚨 安全威胁</a>
        <a href="#ftp" class="nav-button">🌐 FTP活动</a>
        <a href="#ports" class="nav-button">🔌 端口分析</a>
        <a href="#subnets" class="nav-button">🚨 子网攻击</a>
        <a href="#details" class="nav-button">⚠️ 详细分析</a>
    </div>
    
    <!-- 返回顶部按钮 -->
    <button id="topButton" class="top-button" onclick="scrollToTop()" title="返回顶部">⬆️</button>
    
    <div class="container">
        <h1>🔍 IIS日志分析报告</h1>
        <p style="text-align: center; color: #7f8c8d;">生成时间: {self.analysis_data['timestamp']}</p>
        
        <div class="summary" id="summary">
            <div class="summary-item">
                <div class="summary-number">{self.analysis_data['summary']['web_logs_count']:,}</div>
                <div class="summary-label">Web日志记录</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">{self.analysis_data['summary']['ftp_logs_count']:,}</div>
                <div class="summary-label">FTP日志记录</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">{self.analysis_data['security_threats']['total_threats']:,}</div>
                <div class="summary-label">安全威胁</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Web流量分析</h2>
            <h3>状态码分布</h3>
            <table>
                <tr><th>状态码</th><th>次数</th><th>百分比</th></tr>
"""
        
        total_requests = sum(self.analysis_data['web_traffic']['status_codes'].values())
        for code, count in self.analysis_data['web_traffic']['status_codes'].items():
            percentage = (count / total_requests) * 100
            status_class = 'status-200' if code.startswith('2') else 'status-400' if code.startswith('4') else 'status-500'
            html_content += f'<tr><td class="{status_class}">{code}</td><td>{count:,}</td><td>{percentage:.1f}%</td></tr>'
        
        html_content += """
            </table>
            
            <h3>最活跃的客户端IP</h3>
            <table>
                <tr><th>IP地址</th><th>地理位置</th><th>请求次数</th></tr>
"""
        
        for ip, count in list(self.analysis_data['web_traffic']['top_client_ips'].items())[:10]:
            # 获取地理位置信息
            location_info = self.ip_location_cache.get(ip, {})
            country = location_info.get('country', '未知')
            city = location_info.get('city', '')
            isp = location_info.get('isp', '')
            org = location_info.get('org', '')
            
            # 构建简洁的地理位置显示文本
            location_parts = []
            if country != '未知': location_parts.append(country)
            if city: location_parts.append(city)
            
            # 选择ISP或组织信息
            provider = isp if isp else org
            if provider and len(provider) < 50:  # 避免过长的组织名
                location_parts.append(f'({provider})')
            
            location_display = ' '.join(location_parts) if location_parts else '未知'
            
            # 检查该IP是否在详细分析中
            if ip in self.analysis_data['high_risk_ips']:
                html_content += f'<tr><td class="ip-address" onclick="scrollToIP(\'{ip}\')">📍 {ip}</td><td class="ip-location">{location_display}</td><td>{count:,}</td></tr>'
            else:
                html_content += f'<tr><td class="ip-address-inactive">{ip}</td><td class="ip-location">{location_display}</td><td>{count:,}</td></tr>'
        
        html_content += """
            </table>
            
            <h3>最受访问的页面</h3>
            <table>
                <tr><th>页面</th><th>访问次数</th></tr>
"""
        
        for page, count in list(self.analysis_data['web_traffic']['top_pages'].items())[:10]:
            html_content += f'<tr><td>{page}</td><td>{count:,}</td></tr>'
        
        html_content += f"""
            </table>
        </div>

        <div class="section" id="security">
            <h2>🚨 安全威胁分析</h2>
            <p>检测到 <strong>{self.analysis_data['security_threats']['total_threats']}</strong> 个潜在安全威胁</p>
            
            <h3>威胁类型分布</h3>
            <table>
                <tr><th>威胁类型</th><th>次数</th></tr>
"""
        
        for threat_type, count in self.analysis_data['security_threats']['threat_types'].items():
            threat_class = 'threat-high' if count > 500 else 'threat-medium' if count > 100 else 'threat-low'
            html_content += f'<tr class="{threat_class}"><td>{threat_type}</td><td>{count}</td></tr>'
        
        html_content += """
            </table>
            
            <h3>最危险的IP地址</h3>
            <table>
                <tr><th>IP地址</th><th>地理位置</th><th>威胁次数</th></tr>
"""
        
        for ip, count in list(self.analysis_data['security_threats']['dangerous_ips'].items())[:10]:
            location = self.get_ip_location(ip)
            location_str = f"{location.get('country', '')} {location.get('region', '')} {location.get('city', '')}".strip()
            if location.get('isp'):
                location_str += f" ({location.get('isp', '')})"
            if not location_str:
                location_str = "未知"
            
            html_content += f'''<tr>
                <td class="ip-address" onclick="scrollToIP('{ip}')">{ip}</td>
                <td class="ip-location">{location_str}</td>
                <td>{count}</td>
            </tr>'''
        
        html_content += f"""
            </table>
        </div>

        <div class="section" id="ftp">
            <h2>🌐 FTP活动分析</h2>
            <p>FTP连接总数: <strong>{self.analysis_data['ftp_activity']['total_connections']}</strong></p>
            <p>认证尝试: <strong>{self.analysis_data['ftp_activity']['auth_attempts']}</strong></p>
            <p>错误连接: <strong>{self.analysis_data['ftp_activity']['error_connections']}</strong></p>
            
            <h3>FTP客户端IP</h3>
            <table>
                <tr><th>IP地址</th><th>地理位置</th><th>连接次数</th></tr>
"""
        
        for ip, count in list(self.analysis_data['ftp_activity']['top_client_ips'].items())[:10]:
            location_info = self.ip_location_cache.get(ip, {})
            country = location_info.get('country', '未知')
            city = location_info.get('city', '')
            isp = location_info.get('isp', '')
            org = location_info.get('org', '')
            hosting = location_info.get('hosting', False)
            
            # 构建简洁的地理位置显示文本
            location_parts = []
            if country != '未知': location_parts.append(country)
            if city: location_parts.append(city)
            
            # 选择ISP或组织信息
            provider = isp if isp else org
            provider_info = ''
            if provider and len(provider) < 50:
                provider_info = f'<br><small>{provider}</small>'
            
            hosting_badge = ''
            if hosting:
                hosting_badge = '<br><small style="color: #e74c3c;">💻 托管服务器</small>'
            
            location_display = ' '.join(location_parts) if location_parts else '未知'
            location_display += provider_info + hosting_badge
            
            html_content += f'''<tr>
                <td class="ip-address">{ip}</td>
                <td class="ip-location">{location_display}</td>
                <td>{count}</td>
            </tr>'''
        
        html_content += """
            </table>
        </div>

        <div class="section" id="ports">
            <h2>🔌 端口访问分析</h2>
            <h3>端口使用统计</h3>
            <table>
                <tr><th>端口</th><th>访问次数</th></tr>
"""
        
        for port, count in list(self.analysis_data['ip_port_access']['port_statistics'].items())[:10]:
            port_class = 'port-web' if 'Web' in port else 'port-ftp'
            html_content += f'<tr><td class="{port_class}">{port}</td><td>{count:,}</td></tr>'
        
        html_content += """
            </table>
        </div>

        <div class="section" id="subnets">
            <h2>🚨 子网攻击分析</h2>
"""
        
        if self.analysis_data['subnet_attacks']:
            html_content += """
            <p>检测到来自同一子网的多IP协同攻击模式，可能是僵尸网络或云服务器滥用</p>
            <table>
                <tr><th>子网</th><th>IP数量</th><th>总请求数</th><th>威胁数</th><th>威胁比例</th><th>评估</th></tr>
"""
            
            for subnet, data in list(self.analysis_data['subnet_attacks'].items())[:10]:
                # 计算威胁比例 (使用固定的0.2作为默认值，因为已经是高活跃度子网)
                threat_ratio = 0.2  # 简化处理，这些都是可疑子网
                if threat_ratio >= 0.5:
                    assessment = "🔴 极高"
                    assessment_class = "threat-high"
                elif threat_ratio >= 0.3:
                    assessment = "🟠 高"
                    assessment_class = "threat-medium"
                else:
                    assessment = "🟡 中等"
                    assessment_class = "threat-low"
                
                html_content += f'''<tr>
                    <td class="ip-address" onclick="scrollToSubnet('{subnet}/24')" style="cursor: pointer;">{subnet}/24</td>
                    <td>{data['ip_count']}</td>
                    <td>{data['total_requests']:,}</td>
                    <td>-</td>
                    <td>-</td>
                    <td class="{assessment_class}">{assessment}</td>
                </tr>'''
            
            html_content += """
            </table>
            
            <h3>子网详细信息</h3>
"""
            
            for i, (subnet, data) in enumerate(list(self.analysis_data['subnet_attacks'].items())[:10], 1):
                subnet_id = f"subnet-{subnet.replace('.', '-')}-24"
                html_content += f'''
                <div class="ip-detail" id="{subnet_id}">
                    <h4>🔍 子网 {subnet}/24 (第{i}位)</h4>
                    <p><strong>包含IP:</strong> '''
                
                # 显示样本IP及其详细信息
                ip_list = []
                sample_ips = data.get('sample_ips', [])
                for ip in sample_ips:
                    location_info = self.ip_location_cache.get(ip, {})
                    country = location_info.get('country', '未知')
                    city = location_info.get('city', '')
                    isp = location_info.get('isp', '')
                    org = location_info.get('org', '')
                    hosting = location_info.get('hosting', False)
                    
                    location_parts = [country]
                    if city: location_parts.append(city)
                    location_str = ' '.join(location_parts)
                    
                    # 添加提供商信息
                    provider = isp if isp else org
                    if provider:
                        location_str += f" - {provider[:30]}"  # 限制长度
                    
                    if hosting:
                        location_str += " [托管]"
                    
                    ip_list.append(f'<span class="ip-address">{ip}</span> <small class="ip-location">({location_str})</small>')
                
                html_content += ', '.join(ip_list)
                if data['ip_count'] > len(sample_ips):
                    html_content += f" ... 等共 {data['ip_count']} 个IP"
                
                html_content += f'''</p>
                    <p><strong>攻击模式:</strong> 高活跃度分布式访问</p>
                    <p><strong>建议措施:</strong> '''
                
                # 简化威胁评估
                if data['ip_count'] > 100 and data['avg_requests_per_ip'] > 500:
                    html_content += "立即封禁整个子网"
                elif data['ip_count'] > 50 and data['avg_requests_per_ip'] > 300:
                    html_content += "重点监控，考虑限制访问"
                else:
                    html_content += "持续监控异常行为"
                
                html_content += "</p></div>"
        else:
            html_content += "<p>未检测到可疑的子网攻击模式</p>"
        
        html_content += """
        </div>

        <div class="section" id="details">
            <h2>⚠️ 高风险IP详细分析</h2>
"""
        
        for ip, data in self.analysis_data['high_risk_ips'].items():
            location = self.get_ip_location(ip)
            location_str = f"{location.get('country', '')} {location.get('region', '')} {location.get('city', '')}".strip()
            if location.get('isp'):
                location_str += f" ({location.get('isp', '')})"
            if not location_str:
                location_str = "未知"
            
            safe_ip = ip.replace('.', '-')
            html_content += f'<h3 id="detail-{safe_ip}">🔍 IP地址: {ip}</h3>'
            html_content += f'<p style="margin-left: 20px;"><strong>地理位置:</strong> {location_str}</p>'
            html_content += '<div style="margin-left: 20px;">'
            
            if 'web' in data:
                web_data = data['web']
                html_content += f'<p><strong>Web访问:</strong> {web_data["requests"]} 次</p>'
                html_content += f'<p><strong>访问端口:</strong> {web_data["ports"]}</p>'
                html_content += f'<p><strong>状态码:</strong> {web_data["status_codes"]}</p>'
                
                if web_data['top_pages']:
                    html_content += '<p><strong>主要访问页面:</strong></p><ul>'
                    for page, count in web_data['top_pages'].items():
                        html_content += f'<li>{page}: {count} 次</li>'
                    html_content += '</ul>'
            
            if 'ftp' in data:
                ftp_data = data['ftp']
                html_content += f'<p><strong>FTP连接:</strong> {ftp_data["connections"]} 次</p>'
                html_content += f'<p><strong>FTP端口:</strong> {ftp_data["ports"]}</p>'
            
            html_content += '</div>'
        
        html_content += """
        </div>
    </div>
</body>
</html>"""
        
        # 保存HTML文件
        html_filename = f"iis_log_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(html_filename, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return html_filename

    def generate_markdown_report(self):
        """生成Markdown格式报告"""
        md_content = f"""# 🔍 IIS日志分析报告

**生成时间:** {self.analysis_data['timestamp']}

## 📈 数据概览

- **Web日志记录:** {self.analysis_data['summary']['web_logs_count']:,} 条
- **FTP日志记录:** {self.analysis_data['summary']['ftp_logs_count']:,} 条
- **安全威胁:** {self.analysis_data['security_threats']['total_threats']:,} 个

## 📊 Web流量分析

### 状态码分布

| 状态码 | 次数 | 百分比 |
|--------|------|--------|
"""
        
        total_requests = sum(self.analysis_data['web_traffic']['status_codes'].values())
        for code, count in self.analysis_data['web_traffic']['status_codes'].items():
            percentage = (count / total_requests) * 100
            md_content += f"| {code} | {count:,} | {percentage:.1f}% |\n"
        
        md_content += """
### 最活跃的客户端IP

| IP地址 | 请求次数 |
|--------|----------|
"""
        
        for ip, count in list(self.analysis_data['web_traffic']['top_client_ips'].items())[:10]:
            md_content += f"| `{ip}` | {count:,} |\n"
        
        md_content += """
### 最受访问的页面

| 页面 | 访问次数 |
|------|----------|
"""
        
        for page, count in list(self.analysis_data['web_traffic']['top_pages'].items())[:10]:
            md_content += f"| `{page}` | {count:,} |\n"
        
        md_content += f"""
## 🚨 安全威胁分析

检测到 **{self.analysis_data['security_threats']['total_threats']}** 个潜在安全威胁

### 威胁类型分布

| 威胁类型 | 次数 |
|----------|------|
"""
        
        for threat_type, count in self.analysis_data['security_threats']['threat_types'].items():
            md_content += f"| {threat_type} | {count} |\n"
        
        md_content += """
### 最危险的IP地址

| IP地址 | 威胁次数 |
|--------|----------|
"""
        
        for ip, count in list(self.analysis_data['security_threats']['dangerous_ips'].items())[:10]:
            md_content += f"| `{ip}` | {count} |\n"
        
        md_content += f"""
## 🌐 FTP活动分析

- **FTP连接总数:** {self.analysis_data['ftp_activity']['total_connections']}
- **认证尝试:** {self.analysis_data['ftp_activity']['auth_attempts']}
- **错误连接:** {self.analysis_data['ftp_activity']['error_connections']}

### FTP客户端IP

| IP地址 | 连接次数 |
|--------|----------|
"""
        
        for ip, count in list(self.analysis_data['ftp_activity']['top_client_ips'].items())[:10]:
            md_content += f"| `{ip}` | {count} |\n"
        
        md_content += """
## 🔌 端口访问分析

### 端口使用统计

| 端口 | 访问次数 |
|------|----------|
"""
        
        for port, count in list(self.analysis_data['ip_port_access']['port_statistics'].items())[:10]:
            md_content += f"| `{port}` | {count:,} |\n"
        
        md_content += """
## ⚠️ 高风险IP详细分析

"""
        
        for ip, data in self.analysis_data['high_risk_ips'].items():
            md_content += f"### 🔍 IP地址: `{ip}`\n\n"
            
            if 'web' in data:
                web_data = data['web']
                md_content += f"- **Web访问:** {web_data['requests']} 次\n"
                md_content += f"- **访问端口:** {web_data['ports']}\n"
                md_content += f"- **状态码:** {web_data['status_codes']}\n"
                
                if web_data['top_pages']:
                    md_content += "- **主要访问页面:**\n"
                    for page, count in web_data['top_pages'].items():
                        md_content += f"  - `{page}`: {count} 次\n"
            
            if 'ftp' in data:
                ftp_data = data['ftp']
                md_content += f"- **FTP连接:** {ftp_data['connections']} 次\n"
                md_content += f"- **FTP端口:** {ftp_data['ports']}\n"
            
            md_content += "\n"
        
        md_content += """
---
*报告由IIS日志分析工具自动生成*
"""
        
        # 保存Markdown文件
        md_filename = f"iis_log_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(md_filename, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        return md_filename

    def analyze_dangerous_ips_detailed(self):
        """对最危险的IP进行深度分析"""
        print("\n=== 🚨 危险IP深度分析 ===")
        
        # 获取威胁IP数据
        threats = []
        attack_patterns = [
            (r'\.\./', '目录遍历攻击'),
            (r'/\.env', '环境文件访问'),
            (r'/\.git/', 'Git文件访问'),
            (r'<script', 'XSS攻击尝试'),
            (r'union.*select', 'SQL注入尝试'),
            (r'/shell', 'Shell访问尝试'),
            (r'/cgi-bin/', 'CGI漏洞利用'),
            (r'wget|curl', '命令执行尝试'),
            (r'/admin|/wp-admin', '管理面板探测'),
            (r'/phpmyadmin', 'phpMyAdmin探测')
        ]
        
        for log in self.web_logs:
            uri = log['uri_stem'].lower()
            query = log['uri_query'].lower()
            ua = log['user_agent'].lower()
            
            for pattern, threat_type in attack_patterns:
                if re.search(pattern, uri) or re.search(pattern, query) or re.search(pattern, ua):
                    threats.append({
                        'ip': log['client_ip'],
                        'port': log['port'],
                        'uri': log['uri_stem'],
                        'query': log['uri_query'],
                        'threat_type': threat_type,
                        'date': log['date'],
                        'time': log['time'],
                        'user_agent': log['user_agent'],
                        'status_code': log['status_code'],
                        'method': log['method']
                    })
        
        # 获取前5个最危险的IP
        threat_ips = Counter(threat['ip'] for threat in threats).most_common(5)
        
        for ip, threat_count in threat_ips:
            print(f"\n{'='*80}")
            print(f"🔍 危险IP分析: {ip} (威胁行为: {threat_count} 次)")
            print(f"{'='*80}")
            
            # 该IP的所有威胁行为
            ip_threats = [t for t in threats if t['ip'] == ip]
            
            # 威胁时间分布分析
            threat_dates = Counter(t['date'] for t in ip_threats)
            print(f"\n📅 攻击时间分布:")
            for date, count in sorted(threat_dates.items()):
                print(f"  {date}: {count} 次攻击")
            
            # 威胁类型详细分析
            ip_threat_types = Counter(t['threat_type'] for t in ip_threats)
            print(f"\n🎯 攻击类型分布:")
            for threat_type, count in ip_threat_types.most_common():
                print(f"  {threat_type}: {count} 次")
                
                # 显示该类型攻击的具体目标
                type_threats = [t for t in ip_threats if t['threat_type'] == threat_type]
                target_uris = Counter(t['uri'] for t in type_threats).most_common(5)
                for uri, uri_count in target_uris:
                    print(f"    └─ {uri}: {uri_count} 次")
            
            # 攻击端口分析
            attack_ports = Counter(t['port'] for t in ip_threats)
            print(f"\n🔌 攻击端口:")
            for port, count in attack_ports.items():
                print(f"  端口 {port}: {count} 次攻击")
            
            # HTTP方法分析
            methods = Counter(t['method'] for t in ip_threats)
            print(f"\n📊 HTTP方法:")
            for method, count in methods.items():
                print(f"  {method}: {count} 次")
            
            # 响应状态码分析
            status_codes = Counter(t['status_code'] for t in ip_threats)
            print(f"\n📈 响应状态码:")
            for code, count in status_codes.items():
                status_meaning = self._get_status_meaning(code)
                print(f"  {code} ({status_meaning}): {count} 次")
            
            # 用户代理分析
            user_agents = Counter(t['user_agent'] for t in ip_threats if t['user_agent'])
            print(f"\n🖥️  用户代理:")
            for ua, count in user_agents.most_common(3):
                ua_short = ua[:100] + "..." if len(ua) > 100 else ua
                print(f"  {ua_short}: {count} 次")
            
            # 攻击模式分析
            print(f"\n🕒 攻击时间模式:")
            hour_attacks = defaultdict(int)
            for threat in ip_threats:
                try:
                    hour = threat['time'].split(':')[0]
                    hour_attacks[hour] += 1
                except:
                    continue
            
            for hour in sorted(hour_attacks.keys()):
                count = hour_attacks[hour]
                bar = '█' * (count // max(1, max(hour_attacks.values()) // 20))
                print(f"  {hour}:00 - {count:3d} 次 {bar}")
            
            # 该IP的所有活动（不仅仅是威胁）
            all_ip_logs = [log for log in self.web_logs if log['client_ip'] == ip]
            if len(all_ip_logs) > threat_count:
                print(f"\n📊 总体活动统计:")
                print(f"  总请求数: {len(all_ip_logs)}")
                print(f"  威胁请求: {threat_count} ({threat_count/len(all_ip_logs)*100:.1f}%)")
                print(f"  正常请求: {len(all_ip_logs) - threat_count}")
                
                # 正常访问的页面
                normal_requests = [log for log in all_ip_logs if log not in [t['ip'] for t in ip_threats]]
                if normal_requests:
                    normal_pages = Counter(log['uri_stem'] for log in all_ip_logs).most_common(5)
                    print(f"  主要访问页面:")
                    for page, count in normal_pages:
                        print(f"    {page}: {count} 次")
            
            # FTP活动分析
            ftp_logs = [log for log in self.ftp_logs if log['client_ip'] == ip]
            if ftp_logs:
                print(f"\n🌐 FTP活动:")
                print(f"  FTP连接数: {len(ftp_logs)}")
                ftp_methods = Counter(log['method'] for log in ftp_logs)
                for method, count in ftp_methods.most_common():
                    print(f"  {method}: {count} 次")
            
            print(f"\n⚠️  威胁评估: {'极高' if threat_count > 500 else '高' if threat_count > 100 else '中等'}")
            print(f"🛡️  建议: {'立即封禁' if threat_count > 500 else '重点监控' if threat_count > 100 else '加强监控'}")
    
    def _get_status_meaning(self, code):
        """获取HTTP状态码含义"""
        status_meanings = {
            '200': '成功', '206': '部分内容', '301': '永久重定向', '302': '临时重定向',
            '304': '未修改', '400': '错误请求', '403': '禁止访问', '404': '未找到',
            '405': '方法不允许', '406': '不可接受', '500': '服务器错误', '503': '服务不可用'
        }
        return status_meanings.get(code, '未知')

    def generate_report(self):
        """生成完整报告"""
        print("=" * 60)
        print("IIS日志分析报告")
        print("=" * 60)
        print(f"分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 收集分析数据
        self.collect_analysis_data()
        
        # 控制台输出
        self.analyze_web_traffic()
        self.analyze_security_threats()
        self.analyze_ftp_activity()
        self.analyze_ip_port_access()
        self.print_subnet_analysis()  # 新增子网攻击分析
        self.analyze_high_risk_ips()
        self.analyze_dangerous_ips_detailed()  # 新增危险IP深度分析
        
        # 生成HTML和Markdown报告
        html_file = self.generate_html_report()
        md_file = self.generate_markdown_report()
        
        print(f"\n📄 报告文件已生成:")
        print(f"  HTML报告: {html_file}")
        print(f"  Markdown报告: {md_file}")
        
        print("\n" + "=" * 60)

def main():
    # 日志目录
    log_dir = r"d:\Development\Temp\logfiles"
    
    # 创建分析器
    analyzer = IISLogAnalyzer(log_dir)
    
    # 加载并分析日志
    analyzer.load_logs()
    analyzer.generate_report()

if __name__ == "__main__":
    main()