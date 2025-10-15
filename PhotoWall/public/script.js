let allPhotos = [];
let currentPhotoIndex = 0;
let filteredPhotos = [];

// 幻灯片相关变量
let slideshowActive = false;
let slideshowInterval = null;
let slideshowSpeed = 5000; // 默认5秒
let slideshowPhotos = [];
let slideshowIndex = 0;
let progressInterval = null;

// 页面加载时获取照片
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
});

// 加载照片列表
async function loadPhotos() {
    try {
        const response = await fetch('/api/photos');
        allPhotos = await response.json();
        filteredPhotos = [...allPhotos];
        
        displayPhotos(allPhotos);
        createYearFilters(allPhotos);
        
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('photoGrid').classList.add('visible');
    } catch (error) {
        console.error('Failed to load photos:', error);
        document.getElementById('loading').innerHTML = '<p>加载失败，请刷新页面重试</p>';
    }
}

// 显示照片
function displayPhotos(photos) {
    const photoGrid = document.getElementById('photoGrid');
    photoGrid.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.onclick = () => openLightbox(index);
        
        // 格式化日期显示
        const dateStr = photo.date;
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        // 判断是图片还是视频
        if (photo.type === 'video') {
            photoItem.innerHTML = `
                <video src="${photo.path}" preload="metadata" muted
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                </video>
                <div class="video-error" style="display:none; width:100%; height:100%; background:#ddd; align-items:center; justify-content:center;">
                    <span style="color:#999;">视频加载失败</span>
                </div>
                <div class="video-icon">▶</div>
                <div class="photo-overlay">
                    <div class="photo-date">${formattedDate}</div>
                </div>
            `;
        } else {
            photoItem.innerHTML = `
                <img src="${photo.path}" alt="${photo.filename}" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E图片加载失败%3C/text%3E%3C/svg%3E'">
                <div class="photo-overlay">
                    <div class="photo-date">${formattedDate}</div>
                </div>
            `;
        }
        
        photoGrid.appendChild(photoItem);
    });
    
    filteredPhotos = photos;
}

// 创建年份筛选按钮
function createYearFilters(photos) {
    const years = [...new Set(photos.map(p => p.year))].sort().reverse();
    const yearFiltersDiv = document.getElementById('year-filters');
    
    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = year;
        btn.dataset.year = year;
        btn.onclick = () => filterByYear(year, btn);
        yearFiltersDiv.appendChild(btn);
    });
}

// 按年份筛选
function filterByYear(year, btn) {
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (year === 'all') {
        displayPhotos(allPhotos);
    } else {
        const filtered = allPhotos.filter(p => p.year === year);
        displayPhotos(filtered);
    }
}

// "全部"按钮点击事件
document.querySelector('[data-year="all"]').onclick = function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    displayPhotos(allPhotos);
};

// 灯箱功能
function openLightbox(index) {
    currentPhotoIndex = index;
    const photo = filteredPhotos[index];
    const lightbox = document.getElementById('lightbox');
    const contentContainer = document.querySelector('.lightbox-content-container');
    const info = document.getElementById('photoInfo');
    
    // 清空之前的内容
    if (!contentContainer) {
        // 如果容器不存在，创建它
        const oldImg = document.getElementById('lightboxImg');
        const wrapper = document.createElement('div');
        wrapper.className = 'lightbox-content-container';
        oldImg.parentNode.insertBefore(wrapper, oldImg);
        wrapper.appendChild(oldImg);
    }
    
    const container = document.querySelector('.lightbox-content-container');
    container.innerHTML = '';
    
    // 根据类型创建对应的元素
    if (photo.type === 'video') {
        const video = document.createElement('video');
        video.className = 'lightbox-content';
        video.src = photo.path;
        video.controls = true;
        video.autoplay = true;
        container.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.className = 'lightbox-content';
        img.src = photo.path;
        img.alt = photo.filename;
        container.appendChild(img);
    }
    
    const dateStr = photo.date;
    const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    const typeLabel = photo.type === 'video' ? '视频' : '图片';
    info.textContent = `${formattedDate} | ${photo.filename} | ${typeLabel}`;
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function navigatePhoto(direction) {
    currentPhotoIndex += direction;
    
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = filteredPhotos.length - 1;
    } else if (currentPhotoIndex >= filteredPhotos.length) {
        currentPhotoIndex = 0;
    }
    
    openLightbox(currentPhotoIndex);
}

// 事件监听
document.getElementById('closeLightbox').onclick = closeLightbox;
document.getElementById('prevBtn').onclick = () => navigatePhoto(-1);
document.getElementById('nextBtn').onclick = () => navigatePhoto(1);

// 点击灯箱背景关闭
document.getElementById('lightbox').onclick = (e) => {
    if (e.target.id === 'lightbox') {
        closeLightbox();
    }
};

// 键盘导航
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigatePhoto(-1);
        } else if (e.key === 'ArrowRight') {
            navigatePhoto(1);
        }
    }
    
    // 幻灯片键盘控制
    const slideshow = document.getElementById('slideshowMode');
    if (slideshow.classList.contains('active')) {
        if (e.key === 'Escape') {
            exitSlideshow();
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            toggleSlideshowPlayPause();
        } else if (e.key === 'ArrowLeft') {
            previousSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    }
});

// ==================== 幻灯片功能 ====================

// 启动幻灯片
document.getElementById('startSlideshow').addEventListener('click', () => {
    // 包含所有图片和视频
    slideshowPhotos = filteredPhotos.filter(p => p.type === 'image' || p.type === 'video');
    if (slideshowPhotos.length === 0) {
        alert('没有可以播放的内容！');
        return;
    }
    
    slideshowIndex = 0;
    slideshowActive = true;
    
    const slideshowMode = document.getElementById('slideshowMode');
    slideshowMode.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('totalPhotos').textContent = slideshowPhotos.length;
    
    showSlide(slideshowIndex);
    startSlideshowAutoPlay();
    
    // 添加鼠标移动监听，用于显示/隐藏控制栏
    setupMouseMoveHandler();
    
    // 启动实时时钟
    startClock();
    
    // 获取天气信息
    updateWeather();
});

// 实时时钟功能
let clockInterval = null;

function startClock() {
    updateClock(); // 立即更新一次
    clockInterval = setInterval(updateClock, 1000); // 每秒更新
}

function updateClock() {
    const now = new Date();
    
    // 格式化日期：YYYY-MM-DD 星期X
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    const dateStr = `${year}-${month}-${day} ${weekday}`;
    
    // 格式化时间：HH:MM:SS (24小时制)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    
    // 更新显示
    document.getElementById('currentDate').textContent = dateStr;
    document.getElementById('currentTime').textContent = timeStr;
}

function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

// 天气信息功能
async function updateWeather() {
    try {
        // 使用免费的 Open-Meteo API 获取天气（无需API key）
        // 这里使用北京的坐标作为示例，你可以根据需要修改
        const latitude = 39.9042;  // 北京纬度
        const longitude = 116.4074; // 北京经度
        
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia/Shanghai&forecast_days=4`
        );
        
        if (!response.ok) {
            throw new Error('天气数据获取失败');
        }
        
        const data = await response.json();
        
        // 更新当前温度
        const currentTemp = Math.round(data.current.temperature_2m);
        document.getElementById('weatherTemp').textContent = `${currentTemp}°`;
        
        // 更新天气状况
        const weatherCode = data.current.weather_code;
        const condition = getWeatherCondition(weatherCode);
        document.getElementById('weatherCondition').textContent = condition;
        
        // 更新未来三天预报
        const forecast = document.getElementById('weatherForecast');
        const forecastHTML = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 1; i <= 3; i++) {
            const date = new Date(data.daily.time[i]);
            const dayName = days[date.getDay()];
            const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
            forecastHTML.push(`<span>${dayName}<br>${maxTemp}°</span>`);
        }
        
        forecast.innerHTML = forecastHTML.join('');
        
    } catch (error) {
        console.error('获取天气信息失败:', error);
        // 显示默认信息
        document.getElementById('weatherTemp').textContent = '--°';
        document.getElementById('weatherCondition').textContent = '无数据';
    }
}

// 根据天气代码返回天气描述
function getWeatherCondition(code) {
    const weatherCodes = {
        0: 'clear ☀️',
        1: 'mainly clear 🌤️',
        2: 'partly cloudy ⛅',
        3: 'overcast ☁️',
        45: 'foggy 🌫️',
        48: 'foggy 🌫️',
        51: 'light drizzle 🌦️',
        53: 'drizzle 🌦️',
        55: 'heavy drizzle 🌧️',
        61: 'light rain 🌧️',
        63: 'rain 🌧️',
        65: 'heavy rain 🌧️',
        71: 'light snow 🌨️',
        73: 'snow 🌨️',
        75: 'heavy snow ❄️',
        77: 'snow grains ❄️',
        80: 'light showers 🌦️',
        81: 'showers 🌧️',
        82: 'heavy showers 🌧️',
        85: 'light snow showers 🌨️',
        86: 'snow showers ❄️',
        95: 'thunderstorm ⛈️',
        96: 'thunderstorm ⛈️',
        99: 'thunderstorm ⛈️'
    };
    
    return weatherCodes[code] || 'unknown';
}

// EXIF信息功能
async function loadExifInfo(imagePath) {
    try {
        console.log('开始读取EXIF:', imagePath);
        
        // 检查exifr是否可用
        if (typeof exifr === 'undefined') {
            console.error('exifr库未加载');
            hideExifInfo();
            return;
        }
        
        // 判断是否为HEIC文件，如果是则使用原始文件路径读取EXIF
        // 对于JPG也尝试使用原始路径，确保获取完整EXIF
        let exifReadPath = imagePath;
        const lowerPath = imagePath.toLowerCase();
        if (lowerPath.endsWith('.heic') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
            // 使用专门的原始文件API端点
            exifReadPath = '/api/original' + imagePath;
            console.log('使用原始文件路径读取EXIF:', exifReadPath);
        }
        
        // 使用exifr库读取EXIF数据，启用所有选项以支持HEIC
        const exif = await exifr.parse(exifReadPath, {
            tiff: true,
            xmp: true,
            icc: false,
            iptc: true,
            jfif: false,
            ihdr: false,
            gps: true,
            exif: true,
            makerNote: false,
            userComment: true,
            translateKeys: true,     // 重要：转换为友好的字段名
            translateValues: true,   // 重要：转换值为可读格式
            reviveValues: true,
            sanitize: true,
            mergeOutput: true,
            silentErrors: true
        });
        
        console.log('EXIF数据:', exif);
        console.log('所有EXIF键:', exif ? Object.keys(exif) : 'null');
        
        if (exif) {
            console.log('开始解析EXIF字段...');
            
            // 相机型号 - 尝试多种可能的字段组合
            let camera = '';
            const make = exif.Make || exif.make || exif.CameraMake;
            const model = exif.Model || exif.model || exif.CameraModel || exif.CameraModelName;
            
            if (make || model) {
                if (make && model) {
                    camera = `${make} ${model}`.trim();
                } else {
                    camera = (make || model).trim();
                }
            }
            
            // 如果还是没有，尝试其他字段
            if (!camera) {
                camera = exif.LensMake || exif.LensModel || '';
            }
            
            if (!camera) {
                camera = '未知相机';
            }
            
            console.log('相机型号:', camera, '| Make:', make, '| Model:', model);
            
            // 拍摄日期时间 - 尝试多种日期字段
            let datetime = '';
            const dateField = exif.DateTimeOriginal || 
                             exif.DateTime || 
                             exif.CreateDate || 
                             exif.DateCreated ||
                             exif.ModifyDate ||
                             exif.DateTimeDigitized;
            
            console.log('日期字段:', dateField);
            
            if (dateField) {
                try {
                    let date;
                    // 如果是字符串格式 "YYYY:MM:DD HH:MM:SS"
                    if (typeof dateField === 'string') {
                        const parts = dateField.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                        date = new Date(parts);
                    } else {
                        date = new Date(dateField);
                    }
                    
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        datetime = `📅 ${year}-${month}-${day} ${hours}:${minutes}`;
                    }
                } catch (e) {
                    console.log('日期解析失败:', e);
                }
            }
            
            console.log('拍摄日期:', datetime);
            
            // GPS位置信息 - 反向地理编码
            let location = '';
            const lat = exif.latitude || exif.GPSLatitude;
            const lon = exif.longitude || exif.GPSLongitude;
            
            if (lat && lon) {
                console.log('GPS坐标:', lat, lon);
                // 先显示坐标，异步获取地址
                location = `📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                document.getElementById('exifLocation').textContent = location;
                
                // 使用 OpenStreetMap Nominatim 进行反向地理编码（免费，异步更新）
                getAddressFromCoordinates(lat, lon).then(address => {
                    if (address) {
                        document.getElementById('exifLocation').textContent = `📍 ${address}`;
                    }
                }).catch(err => {
                    console.log('地理编码失败:', err);
                });
            }
            
            // 焦距 - 尝试多种字段
            let focalLength = '';
            const focal = exif.FocalLength || exif.FocalLengthIn35mmFormat || exif.FocalLengthIn35mmFilm;
            if (focal) {
                focalLength = `${Math.round(focal)}mm`;
            }
            console.log('焦距:', focalLength, '| FocalLength:', exif.FocalLength);
            
            // 光圈 - 尝试多种字段
            let aperture = '';
            const fNumber = exif.FNumber || exif.ApertureValue || exif.MaxApertureValue;
            if (fNumber) {
                aperture = `f/${Number(fNumber).toFixed(1)}`;
            }
            console.log('光圈:', aperture, '| FNumber:', exif.FNumber, '| ApertureValue:', exif.ApertureValue);
            
            // 快门速度 - 尝试多种字段
            let shutter = '';
            const exposureTime = exif.ExposureTime || exif.ShutterSpeedValue || exif.ShutterSpeed;
            console.log('曝光时间原始值:', exposureTime, '| 类型:', typeof exposureTime);
            
            if (exposureTime !== undefined && exposureTime !== null) {
                const expValue = Number(exposureTime);
                if (!isNaN(expValue)) {
                    if (expValue < 1 && expValue > 0) {
                        shutter = `1/${Math.round(1 / expValue)}s`;
                    } else if (expValue >= 1) {
                        shutter = `${expValue.toFixed(1)}s`;
                    }
                }
            }
            console.log('快门速度:', shutter);
            
            // ISO - 尝试多种字段
            let iso = '';
            const isoValue = exif.ISO || 
                            exif.ISOSpeedRatings || 
                            exif.PhotographicSensitivity ||
                            exif.ISOSpeed ||
                            (exif.ISOSpeedRatings && Array.isArray(exif.ISOSpeedRatings) ? exif.ISOSpeedRatings[0] : null);
            
            if (isoValue) {
                iso = `ISO ${isoValue}`;
            }
            console.log('ISO:', iso, '| 原始值:', isoValue);
            
            console.log('解析结果:', { camera, datetime, location, focalLength, aperture, shutter, iso });
            
            // 更新显示
            document.getElementById('exifCamera').textContent = camera;
            document.getElementById('exifDatetime').textContent = datetime;
            document.getElementById('exifLocation').textContent = location;
            document.getElementById('exifFocalLength').textContent = focalLength;
            document.getElementById('exifAperture').textContent = aperture;
            document.getElementById('exifShutter').textContent = shutter;
            document.getElementById('exifISO').textContent = iso;
            
            // 只要有任何信息就显示
            if (camera !== '未知相机' || datetime || location || focalLength || aperture || shutter || iso) {
                showExifInfo();
            } else {
                hideExifInfo();
            }
        } else {
            console.log('未读取到EXIF数据');
            hideExifInfo();
        }
    } catch (error) {
        console.error('读取EXIF信息失败:', error);
        hideExifInfo();
    }
}

function showExifInfo() {
    const exifDisplay = document.getElementById('exifDisplay');
    exifDisplay.classList.add('show');
}

function hideExifInfo() {
    const exifDisplay = document.getElementById('exifDisplay');
    exifDisplay.classList.remove('show');
}

// GPS反向地理编码 - 异步获取地址
async function getAddressFromCoordinates(lat, lon) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=zh-CN`,
            {
                headers: {
                    'User-Agent': 'PhotoWall/1.0'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            const addr = data.address;
            let addressParts = [];
            
            // 优先显示有意义的地址信息
            if (addr.city) addressParts.push(addr.city);
            else if (addr.town) addressParts.push(addr.town);
            else if (addr.village) addressParts.push(addr.village);
            
            if (addr.suburb) addressParts.push(addr.suburb);
            else if (addr.road) addressParts.push(addr.road);
            
            if (addressParts.length > 0) {
                return addressParts.join(', ');
            } else if (data.display_name) {
                const nameParts = data.display_name.split(',').slice(0, 3);
                return nameParts.join(',');
            }
        }
    } catch (error) {
        console.log('地理编码请求失败:', error);
    }
    return null;
}

// 鼠标移动处理 - 控制工具栏显示/隐藏
let mouseMoveTimeout;
function setupMouseMoveHandler() {
    const controls = document.querySelector('.slideshow-controls');
    const info = document.querySelector('.slideshow-info');
    const slideshow = document.getElementById('slideshowMode');
    
    function showControls() {
        controls.classList.add('show');
        info.classList.add('show');
        
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = setTimeout(() => {
            controls.classList.remove('show');
            info.classList.remove('show');
        }, 3000); // 3秒后自动隐藏
    }
    
    slideshow.addEventListener('mousemove', showControls);
    
    // 鼠标进入控制栏时保持显示
    controls.addEventListener('mouseenter', () => {
        clearTimeout(mouseMoveTimeout);
        controls.classList.add('show');
        info.classList.add('show');
    });
    
    // 鼠标离开控制栏时开始倒计时隐藏
    controls.addEventListener('mouseleave', () => {
        mouseMoveTimeout = setTimeout(() => {
            controls.classList.remove('show');
            info.classList.remove('show');
        }, 3000);
    });
}

// 显示幻灯片
function showSlide(index) {
    if (!slideshowPhotos || slideshowPhotos.length === 0) return;
    
    const photo = slideshowPhotos[index];
    const container = document.querySelector('.slideshow-container');
    
    // 先将当前活动的图片淡出并移除所有旧内容
    const allActive = container.querySelectorAll('.slideshow-image.active');
    allActive.forEach(active => {
        active.classList.remove('active');
        setTimeout(() => {
            if (active.parentNode) {
                active.remove();
            }
        }, 1000);
    });
    
    // 创建新内容
    if (photo.type === 'video') {
        const newContent = document.createElement('video');
        newContent.src = photo.path;
        newContent.controls = true;
        newContent.autoplay = true;
        newContent.muted = true;
        newContent.loop = false;
        newContent.className = 'slideshow-image';
        
        // 视频结束后自动下一张
        newContent.addEventListener('ended', () => {
            if (slideshowActive && slideshowInterval) {
                nextSlide();
            }
        });
        
        container.appendChild(newContent);
        
        // 触发淡入动画
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                newContent.classList.add('active');
            });
        });
        
        // 视频不显示EXIF
        hideExifInfo();
    } else {
        // 图片需要检测是否为竖版
        const img = new Image();
        img.onload = function() {
            const isPortrait = this.naturalHeight > this.naturalWidth;
            
            if (isPortrait) {
                // 竖版图片 - 尝试显示两张
                const nextIndex = (index + 1) % slideshowPhotos.length;
                const nextPhoto = slideshowPhotos[nextIndex];
                
                // 获取窗口尺寸
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const windowRatio = windowWidth / windowHeight;
                const imageRatio = this.naturalWidth / this.naturalHeight;
                
                // 第一张竖版图片
                const img1 = document.createElement('img');
                img1.src = photo.path;
                img1.alt = photo.filename;
                img1.className = 'slideshow-image portrait';
                container.appendChild(img1);
                
                // 图片加载完成后调整显示
                img1.onload = function() {
                    adjustImageDisplay(img1);
                };
                
                // 检查下一张是否也是竖版图片
                if (nextPhoto && nextPhoto.type === 'image') {
                    const img2Temp = new Image();
                    img2Temp.onload = function() {
                        const isNextPortrait = this.naturalHeight > this.naturalWidth;
                        
                        if (isNextPortrait) {
                            // 下一张也是竖版，显示两张并排
                            const img2 = document.createElement('img');
                            img2.src = nextPhoto.path;
                            img2.alt = nextPhoto.filename;
                            img2.className = 'slideshow-image portrait';
                            container.appendChild(img2);
                            
                            // 图片加载完成后调整显示
                            img2.onload = function() {
                                adjustImageDisplay(img2);
                            };
                            
                            // 智能判断：如果两张竖版并排后仍有大量空白，添加模糊背景
                            const dualImageRatio = (imageRatio * 2); // 两张并排的等效比例
                            if (dualImageRatio < windowRatio * 0.7) {
                                // 图片太窄，添加背景
                                const bgImg = document.createElement('img');
                                bgImg.src = photo.path;
                                bgImg.className = 'slideshow-background';
                                container.insertBefore(bgImg, img1);
                            }
                            
                            // 触发淡入动画
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    img1.classList.add('active');
                                    img2.classList.add('active');
                                });
                            });
                        } else {
                            // 下一张不是竖版，只显示一张竖版
                            img1.classList.add('single');
                            
                            // 创建模糊背景
                            const bgImg = document.createElement('img');
                            bgImg.src = photo.path;
                            bgImg.className = 'slideshow-background';
                            container.insertBefore(bgImg, img1);
                            
                            // 智能判断：如果图片比例接近屏幕，使用contain保持完整
                            if (Math.abs(imageRatio - windowRatio) < 0.3) {
                                img1.classList.add('fit-contain');
                            }
                            
                            // 图片已经有onload，这里触发淡入动画
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    img1.classList.add('active');
                                });
                            });
                        }
                    };
                    img2Temp.src = nextPhoto.path;
                } else {
                    // 没有下一张或下一张是视频，只显示一张
                    img1.classList.add('single');
                    
                    // 创建模糊背景
                    const bgImg = document.createElement('img');
                    bgImg.src = photo.path;
                    bgImg.className = 'slideshow-background';
                    container.insertBefore(bgImg, img1);
                    
                    // 智能判断：如果图片比例接近屏幕，使用contain保持完整
                    if (Math.abs(imageRatio - windowRatio) < 0.3) {
                        img1.classList.add('fit-contain');
                    }
                    
                    // 图片已经有onload，这里触发淡入动画
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            img1.classList.add('active');
                        });
                    });
                }
                
                // 读取并显示EXIF信息
                loadExifInfo(photo.path);
            } else {
                // 横版图片 - 正常显示一张
                const newContent = document.createElement('img');
                newContent.src = photo.path;
                newContent.alt = photo.filename;
                newContent.className = 'slideshow-image';
                container.appendChild(newContent);
                
                // 图片加载完成后调整显示
                newContent.onload = function() {
                    adjustImageDisplay(newContent);
                };
                
                // 触发淡入动画
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        newContent.classList.add('active');
                    });
                });
                
                // 读取并显示EXIF信息
                loadExifInfo(photo.path);
            }
        };
        img.src = photo.path;
    }
    
    // 更新信息
    const dateStr = photo.date;
    const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    const typeLabel = photo.type === 'video' ? '🎬 视频' : '📷 照片';
    document.querySelector('.photo-date-time').textContent = `${formattedDate} ${typeLabel}`;
    document.querySelector('.photo-filename').textContent = photo.filename;
    
    document.getElementById('currentIndex').textContent = index + 1;
    
    // 重置进度条
    resetProgress();
}

// 自动播放
function startSlideshowAutoPlay() {
    stopSlideshowAutoPlay();
    
    slideshowInterval = setInterval(() => {
        nextSlide();
    }, slideshowSpeed);
    
    startProgress();
}

function stopSlideshowAutoPlay() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    stopProgress();
}

// 进度条
function startProgress() {
    stopProgress();
    
    const progressFill = document.getElementById('progressFill');
    let progress = 0;
    const step = 100 / (slideshowSpeed / 100);
    
    progressInterval = setInterval(() => {
        progress += step;
        if (progress >= 100) {
            progress = 100;
        }
        progressFill.style.width = progress + '%';
    }, 100);
}

function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function resetProgress() {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = '0%';
    if (slideshowInterval) {
        startProgress();
    }
}

// 下一张
function nextSlide() {
    slideshowIndex = (slideshowIndex + 1) % slideshowPhotos.length;
    showSlide(slideshowIndex);
}

// 上一张
function previousSlide() {
    slideshowIndex = (slideshowIndex - 1 + slideshowPhotos.length) % slideshowPhotos.length;
    showSlide(slideshowIndex);
    
    // 如果正在播放，重新开始计时
    if (slideshowInterval) {
        startSlideshowAutoPlay();
    }
}

// 播放/暂停切换
function toggleSlideshowPlayPause() {
    const icon = document.getElementById('playPauseIcon');
    
    if (slideshowInterval) {
        stopSlideshowAutoPlay();
        icon.textContent = '▶';
    } else {
        startSlideshowAutoPlay();
        icon.textContent = '⏸';
    }
}

// 退出幻灯片
function exitSlideshow() {
    slideshowActive = false;
    stopSlideshowAutoPlay();
    stopClock(); // 停止时钟
    
    const slideshowMode = document.getElementById('slideshowMode');
    slideshowMode.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 幻灯片控制按钮
document.getElementById('slideshowPlayPause').addEventListener('click', toggleSlideshowPlayPause);
document.getElementById('slideshowPrev').addEventListener('click', () => {
    previousSlide();
});
document.getElementById('slideshowNext').addEventListener('click', () => {
    nextSlide();
});
document.getElementById('exitSlideshow').addEventListener('click', exitSlideshow);

// 速度控制
document.getElementById('speedSlider').addEventListener('input', (e) => {
    slideshowSpeed = e.target.value * 1000;
    document.getElementById('speedValue').textContent = e.target.value + 's';
    
    // 如果正在播放，重新启动以应用新速度
    if (slideshowInterval) {
        startSlideshowAutoPlay();
    }
});

// 窗口调整大小时的智能重新计算
let resizeTimeout;
window.addEventListener('resize', () => {
    // 防抖处理
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (slideshowActive && slideshowPhotos && slideshowPhotos.length > 0) {
            // 获取当前显示的图片
            const currentImages = document.querySelectorAll('.slideshow-image.active');
            
            currentImages.forEach(img => {
                if (img.tagName.toLowerCase() === 'img' && !img.classList.contains('slideshow-background')) {
                    adjustImageDisplay(img);
                }
            });
        }
    }, 150); // 150ms防抖
});

// 智能调整图片显示以适应窗口大小
function adjustImageDisplay(img) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowRatio = windowWidth / windowHeight;
    
    // 获取图片的自然尺寸
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    
    // 计算图片应该以哪个维度为基准
    // 如果图片比窗口更宽（相对于各自的高度），则以高度为基准
    // 如果图片比窗口更高（相对于各自的宽度），则以宽度为基准
    
    if (img.classList.contains('portrait') && !img.classList.contains('single')) {
        // 并排竖版图片
        const halfWindowRatio = windowRatio / 2; // 每张图片占据一半宽度
        
        if (imageRatio > halfWindowRatio) {
            // 图片相对更宽，以高度为基准（100%高度）
            img.style.width = 'auto';
            img.style.height = '100%';
            img.style.minWidth = '50%';
            img.style.minHeight = '100%';
        } else {
            // 图片相对更高，以宽度为基准（50%宽度）
            img.style.width = '50%';
            img.style.height = 'auto';
            img.style.minWidth = '50%';
            img.style.minHeight = '100%';
        }
    } else if (img.classList.contains('fit-contain')) {
        // 使用contain模式，保持完整图片
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.minWidth = '0';
        img.style.minHeight = '0';
    } else {
        // 普通模式 - 确保填充整个屏幕同时保持中心
        if (imageRatio > windowRatio) {
            // 图片相对更宽，以高度为基准（填满高度）
            img.style.width = 'auto';
            img.style.height = '100%';
            img.style.minHeight = '100%';
            img.style.minWidth = '0';
        } else {
            // 图片相对更高，以宽度为基准（填满宽度）
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.minWidth = '100%';
            img.style.minHeight = '0';
        }
    }
}
