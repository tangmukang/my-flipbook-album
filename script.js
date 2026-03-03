// 电子翻页相册 JavaScript 交互逻辑

class FlipBook {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 6;
        this.isAnimating = false;
        this.autoPlayInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.init();
    }

    init() {
        // 获取DOM元素
        this.pages = document.querySelectorAll('.page');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.autoPlayBtn = document.getElementById('autoPlayBtn');
        this.currentPageEl = document.getElementById('currentPage');
        this.totalPagesEl = document.getElementById('totalPages');
        this.thumbnailsContainer = document.getElementById('thumbnails');

        // 设置总页数
        this.totalPages = this.pages.length;
        this.totalPagesEl.textContent = this.totalPages;

        // 初始化页面状态
        this.updatePages();

        // 生成缩略图
        this.generateThumbnails();

        // 绑定事件
        this.bindEvents();
    }

    bindEvents() {
        // 点击翻页按钮
        this.prevBtn.addEventListener('click', () => this.prevPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
        });

        // 触摸滑动
        const flipbook = document.getElementById('flipbook');
        flipbook.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        });

        flipbook.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });

        // 点击页面翻页
        flipbook.addEventListener('click', (e) => {
            const rect = flipbook.getBoundingClientRect();
            const clickX = e.clientX - rect.left;

            if (clickX < rect.width / 2) {
                this.prevPage();
            } else {
                this.nextPage();
            }
        });

        // 全屏按钮
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // 自动播放按钮
        this.autoPlayBtn.addEventListener('click', () => this.toggleAutoPlay());
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 向左滑动，下一页
                this.nextPage();
            } else {
                // 向右滑动，上一页
                this.prevPage();
            }
        }
    }

    updatePages() {
        this.pages.forEach((page, index) => {
            page.classList.remove('active', 'flipped', 'next');

            if (index < this.currentPage) {
                // 已翻过的页面
                page.classList.add('flipped');
            } else if (index === this.currentPage) {
                // 当前页面
                page.classList.add('active');
            } else {
                // 后续页面
                page.classList.add('next');
            }
        });

        // 更新页码显示
        this.currentPageEl.textContent = this.currentPage + 1;

        // 更新缩略图状态
        this.updateThumbnails();

        // 更新按钮状态
        this.prevBtn.style.opacity = this.currentPage === 0 ? '0.3' : '1';
        this.prevBtn.style.cursor = this.currentPage === 0 ? 'not-allowed' : 'pointer';
        this.nextBtn.style.opacity = this.currentPage === this.totalPages - 1 ? '0.3' : '1';
        this.nextBtn.style.cursor = this.currentPage === this.totalPages - 1 ? 'not-allowed' : 'pointer';
    }

    nextPage() {
        if (this.isAnimating || this.currentPage >= this.totalPages - 1) return;

        this.isAnimating = true;
        this.currentPage++;
        this.updatePages();

        setTimeout(() => {
            this.isAnimating = false;
        }, 600);
    }

    prevPage() {
        if (this.isAnimating || this.currentPage <= 0) return;

        this.isAnimating = true;
        this.currentPage--;
        this.updatePages();

        setTimeout(() => {
            this.isAnimating = false;
        }, 600);
    }

    goToPage(pageIndex) {
        if (this.isAnimating || pageIndex === this.currentPage) return;

        this.isAnimating = true;
        this.currentPage = pageIndex;
        this.updatePages();

        setTimeout(() => {
            this.isAnimating = false;
        }, 600);
    }

    generateThumbnails() {
        this.thumbnailsContainer.innerHTML = '';

        this.pages.forEach((page, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail';
            if (index === 0) thumbnail.classList.add('active');

            const img = page.querySelector('.photo');
            if (img) {
                const thumbImg = document.createElement('img');
                thumbImg.src = img.src;
                thumbImg.alt = `缩略图 ${index + 1}`;
                thumbnail.appendChild(thumbImg);
            }

            thumbnail.addEventListener('click', () => this.goToPage(index));
            this.thumbnailsContainer.appendChild(thumbnail);
        });
    }

    updateThumbnails() {
        const thumbnails = this.thumbnailsContainer.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentPage) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    toggleFullscreen() {
        const container = document.querySelector('.container');

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('无法进入全屏模式:', err);
            });
            this.fullscreenBtn.textContent = '🔍 退出全屏';
        } else {
            document.exitFullscreen();
            this.fullscreenBtn.textContent = '🔍 全屏';
        }
    }

    toggleAutoPlay() {
        if (this.autoPlayInterval) {
            // 停止自动播放
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
            this.autoPlayBtn.textContent = '▶️ 自动播放';
        } else {
            // 开始自动播放
            this.autoPlayInterval = setInterval(() => {
                if (this.currentPage >= this.totalPages - 1) {
                    this.currentPage = -1; // 重新开始
                }
                this.nextPage();
            }, 3000); // 每3秒翻一页
            this.autoPlayBtn.textContent = '⏸️ 停止播放';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new FlipBook();
});

// 监听全屏变化
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!document.fullscreenElement) {
        fullscreenBtn.textContent = '🔍 全屏';
    }
});
