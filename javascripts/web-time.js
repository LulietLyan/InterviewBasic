// 计算网站运行时间
function calculateWebTime() {
    // 设置网站上线时间
    const startTime = new Date("2025-05-30T16:25:48"); // 替换为实际上线时间
    const now = new Date(); // 当前时间

    // 计算总的时间差（以毫秒为单位）
    const diff = now - startTime;

    // 转换为年、月、天、小时、分钟
    let years = now.getFullYear() - startTime.getFullYear();
    let months = now.getMonth() - startTime.getMonth();
    let days = now.getDate() - startTime.getDate();
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    // 调整月份和天数
    if (days < 0) {
        months -= 1; // 借一个月
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0); // 上个月的最后一天
        days += previousMonth.getDate(); // 补足天数
    }
    if (months < 0) {
        years -= 1; // 借一年
        months += 12; // 补足月份
    }

    // 动态生成显示内容
    let displayText = "";
    if (years > 0) {
        displayText += `${years} 年 `;
    }
    displayText += `${months} 个月 ${days} 天 ${hours} 小时 ${minutes} 分钟`;

    // 显示运行时间
    document.getElementById("web-time").innerText = displayText;
}

// 页面加载完成后执行
window.onload = calculateWebTime;

// 记录访问量
function updateVisitCount() {
    const visitCountKey = "visitCount";
    let visitCount = localStorage.getItem(visitCountKey);

    if (!visitCount) {
        visitCount = 1; // 第一次访问
    } else {
        visitCount = parseInt(visitCount) + 1; // 增加访问量
    }

    localStorage.setItem(visitCountKey, visitCount);
    document.getElementById("visit-count").innerText = visitCount;
}

// 页面加载完成后执行
window.onload = function () {
    calculateWebTime(); // 调用网站运行时间函数
    updateVisitCount(); // 更新访问量
};