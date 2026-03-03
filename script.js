// 电子翻页相册 JavaScript 交互逻辑

class FlipBook {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 6;
        this.isAnimating = false;
        this.animationDuration = 920;
        this.autoPlayInterval = null;
        this.audioContext = null;
        this.audioUnlocked = false;
        this.noiseBufferCache = null;
        this.isDragging = false;
        this.dragDirection = null;
        this.dragPageIndex = -1;
        this.dragPageEl = null;
        this.dragStartX = 0;
        this.dragProgress = 0;
        this.dragPointerId = null;
        this.dragRect = null;
        this.dragDistance = 0;
        this.suppressClickUntil = 0;

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
        this.flipbookEl = document.getElementById('flipbook');
        this.flipAudioEl = document.getElementById('flipSound');

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
        this.setupAudioUnlock();

        // 点击翻页按钮
        this.prevBtn.addEventListener('click', () => this.prevPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
        });

        // 拖拽书页翻页（鼠标 + 触摸）
        this.flipbookEl.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.flipbookEl.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.flipbookEl.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.flipbookEl.addEventListener('pointercancel', (e) => this.handlePointerCancel(e));
        this.flipbookEl.addEventListener('lostpointercapture', (e) => this.handlePointerCancel(e));

        // 点击页面翻页
        this.flipbookEl.addEventListener('click', (e) => {
            if (Date.now() < this.suppressClickUntil || this.isDragging) {
                e.preventDefault();
                return;
            }

            const rect = this.flipbookEl.getBoundingClientRect();
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

    handlePointerDown(e) {
        if (this.isAnimating || this.isDragging) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const rect = this.flipbookEl.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const edgeZone = isMobile ? rect.width * 0.42 : Math.min(160, rect.width * 0.24);

        let direction = null;
        let pageIndex = -1;

        if (localX > rect.width - edgeZone && this.currentPage < this.totalPages - 1) {
            direction = 'forward';
            pageIndex = this.currentPage;
        } else if (localX < edgeZone && this.currentPage > 0) {
            direction = 'backward';
            pageIndex = this.currentPage - 1;
        }

        if (!direction) return;

        this.startDragFlip(direction, pageIndex, e.pointerId, localX, rect);
        try {
            this.flipbookEl.setPointerCapture(e.pointerId);
        } catch (_) {}
        e.preventDefault();
    }

    handlePointerMove(e) {
        if (!this.isDragging || e.pointerId !== this.dragPointerId) return;

        const localX = this.clamp(e.clientX - this.dragRect.left, 0, this.dragRect.width);
        const deltaX = localX - this.dragStartX;
        const progress = this.dragDirection === 'forward'
            ? this.clamp(-deltaX / this.dragDistance, 0, 1)
            : this.clamp(deltaX / this.dragDistance, 0, 1);

        this.dragProgress = progress;
        this.applyDragFlip(progress);
        e.preventDefault();
    }

    handlePointerUp(e) {
        if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
        this.finishDragFlip();
        e.preventDefault();
    }

    handlePointerCancel(e) {
        if (!this.isDragging) return;
        if (typeof e.pointerId === 'number' && e.pointerId !== this.dragPointerId) return;
        this.finishDragFlip(true);
    }

    startDragFlip(direction, pageIndex, pointerId, startX, rect) {
        const page = this.pages[pageIndex];
        if (!page) return;

        this.isDragging = true;
        this.dragDirection = direction;
        this.dragPageIndex = pageIndex;
        this.dragPageEl = page;
        this.dragStartX = startX;
        this.dragProgress = direction === 'forward' ? 0 : 1;
        this.dragPointerId = pointerId;
        this.dragRect = rect;
        this.dragDistance = rect.width * (window.matchMedia('(max-width: 768px)').matches ? 0.62 : 0.72);

        this.flipbookEl.classList.add('is-dragging', direction === 'forward' ? 'drag-forward' : 'drag-backward');
        page.classList.add('is-dragging-page');
        page.style.transition = 'none';
        page.style.zIndex = '8';
        this.applyDragFlip(this.dragProgress);
    }

    applyDragFlip(progress) {
        if (!this.dragPageEl) return;

        const angle = this.dragDirection === 'forward'
            ? -180 * progress
            : -180 + 180 * progress;

        const translateX = this.dragDirection === 'forward'
            ? -12 * progress
            : -12 + 12 * progress;

        const arc = Math.sin(Math.PI * progress);
        const rotateZ = (this.dragDirection === 'forward' ? -1 : 1) * arc * 8.5;
        const skewY = (this.dragDirection === 'forward' ? -1 : 1) * arc * 3.2;
        const liftZ = arc * 8;

        this.dragPageEl.style.transform = `translateZ(${liftZ}px) rotateY(${angle}deg) translateX(${translateX}px) rotateZ(${rotateZ}deg) skewY(${skewY}deg)`;
        this.dragPageEl.style.setProperty('--drag-progress', progress.toFixed(3));
        this.flipbookEl.style.setProperty('--drag-progress', progress.toFixed(3));
    }

    finishDragFlip(forceCancel = false) {
        if (!this.isDragging || !this.dragPageEl) return;

        const direction = this.dragDirection;
        const page = this.dragPageEl;
        const shouldTurn = !forceCancel && this.dragProgress > (window.matchMedia('(max-width: 768px)').matches ? 0.24 : 0.32);
        const commitDuration = 420;

        this.isDragging = false;
        this.isAnimating = true;
        this.suppressClickUntil = Date.now() + 220;

        page.style.transition = `transform ${commitDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
        page.classList.remove('is-dragging-page');
        this.flipbookEl.classList.remove('is-dragging', 'drag-forward', 'drag-backward');

        const targetAngle = shouldTurn
            ? (direction === 'forward' ? -180 : 0)
            : (direction === 'forward' ? 0 : -180);
        const targetX = shouldTurn
            ? (direction === 'forward' ? -12 : 0)
            : (direction === 'forward' ? 0 : -12);

        requestAnimationFrame(() => {
            page.style.transform = `translateZ(0) rotateY(${targetAngle}deg) translateX(${targetX}px) rotateZ(0deg) skewY(0deg)`;
            page.style.setProperty('--drag-progress', shouldTurn ? '1' : '0');
            this.flipbookEl.style.setProperty('--drag-progress', shouldTurn ? '1' : '0');
        });

        setTimeout(() => {
            if (shouldTurn) {
                this.currentPage += direction === 'forward' ? 1 : -1;
                this.markBookAnimation(direction);
                this.playFlipSound(direction);
            }

            this.clearDragStyles();
            this.updatePages();
            this.isAnimating = false;
        }, commitDuration + 20);
    }

    clearDragStyles() {
        if (this.dragPageEl) {
            this.dragPageEl.classList.remove('is-dragging-page');
            this.dragPageEl.style.removeProperty('transition');
            this.dragPageEl.style.removeProperty('transform');
            this.dragPageEl.style.removeProperty('z-index');
            this.dragPageEl.style.removeProperty('--drag-progress');
        }

        this.flipbookEl.classList.remove('is-dragging', 'drag-forward', 'drag-backward');
        this.flipbookEl.style.removeProperty('--drag-progress');
        this.dragDirection = null;
        this.dragPageIndex = -1;
        this.dragPageEl = null;
        this.dragStartX = 0;
        this.dragProgress = 0;
        this.dragPointerId = null;
        this.dragRect = null;
        this.dragDistance = 0;
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    setupAudioUnlock() {
        const unlockOnce = () => this.unlockAudio();
        window.addEventListener('pointerdown', unlockOnce, { once: true });
        window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });
        window.addEventListener('keydown', unlockOnce, { once: true });
    }

    unlockAudio() {
        if (this.audioUnlocked) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!this.audioContext) {
            this.audioContext = new AudioContextClass();
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }

        this.audioUnlocked = true;
    }

    playFlipSound(direction = 'forward') {
        if (this.playRecordedFlipSound(direction)) return;
        if (!this.audioUnlocked || !this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => this.playFlipSound(direction)).catch(() => {});
            return;
        }

        const now = this.audioContext.currentTime;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.getNoiseBuffer();

        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = direction === 'forward' ? 360 : 300;

        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = direction === 'forward' ? 2700 : 2400;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(direction === 'forward' ? 0.34 : 0.28, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        const flutter = this.audioContext.createOscillator();
        const flutterGain = this.audioContext.createGain();
        flutter.type = 'triangle';
        flutter.frequency.setValueAtTime(direction === 'forward' ? 85 : 70, now);
        flutter.frequency.exponentialRampToValueAtTime(direction === 'forward' ? 42 : 35, now + 0.2);
        flutterGain.gain.setValueAtTime(0.0001, now);
        flutterGain.gain.exponentialRampToValueAtTime(0.018, now + 0.03);
        flutterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        flutter.connect(flutterGain);
        flutterGain.connect(this.audioContext.destination);

        source.start(now);
        source.stop(now + 0.25);
        flutter.start(now);
        flutter.stop(now + 0.23);
    }

    getNoiseBuffer() {
        if (this.noiseBufferCache) return this.noiseBufferCache;

        const length = Math.floor(this.audioContext.sampleRate * 0.26);
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            const decay = 1 - i / length;
            data[i] = (Math.random() * 2 - 1) * Math.pow(decay, 0.6);
        }
        this.noiseBufferCache = buffer;
        return buffer;
    }

    playRecordedFlipSound(direction = 'forward') {
        if (!this.flipAudioEl) return false;
        const src = this.flipAudioEl.getAttribute('src');
        if (!src) return false;
        if (this.flipAudioEl.readyState < 2) return false;

        const audio = this.flipAudioEl.cloneNode(true);
        audio.volume = direction === 'forward' ? 0.9 : 0.8;
        audio.play().catch(() => {});
        return true;
    }

    markBookAnimation(direction) {
        if (!this.flipbookEl) return;

        const forwardClass = 'is-flipping-forward';
        const backwardClass = 'is-flipping-backward';
        this.flipbookEl.classList.remove(forwardClass, backwardClass);
        void this.flipbookEl.offsetWidth;
        this.flipbookEl.classList.add(direction === 'forward' ? forwardClass : backwardClass);

        setTimeout(() => {
            this.flipbookEl.classList.remove(forwardClass, backwardClass);
        }, this.animationDuration);
    }

    markFlipAnimation(pageIndex, direction) {
        const page = this.pages[pageIndex];
        if (!page) return;

        const animationClass = direction === 'forward' ? 'flipping-forward' : 'flipping-backward';
        page.classList.add(animationClass);

        setTimeout(() => {
            page.classList.remove(animationClass);
        }, this.animationDuration);
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
        if (this.isAnimating || this.isDragging || this.currentPage >= this.totalPages - 1) return;

        const fromPageIndex = this.currentPage;
        this.isAnimating = true;
        this.currentPage++;
        this.markBookAnimation('forward');
        this.markFlipAnimation(fromPageIndex, 'forward');
        this.updatePages();
        this.playFlipSound('forward');

        setTimeout(() => {
            this.isAnimating = false;
        }, this.animationDuration);
    }

    prevPage() {
        if (this.isAnimating || this.isDragging || this.currentPage <= 0) return;

        const toPageIndex = this.currentPage - 1;
        this.isAnimating = true;
        this.currentPage--;
        this.markBookAnimation('backward');
        this.markFlipAnimation(toPageIndex, 'backward');
        this.updatePages();
        this.playFlipSound('backward');

        setTimeout(() => {
            this.isAnimating = false;
        }, this.animationDuration);
    }

    goToPage(pageIndex) {
        if (this.isAnimating || this.isDragging || pageIndex === this.currentPage) return;

        const direction = pageIndex > this.currentPage ? 'forward' : 'backward';
        const animationPageIndex = direction === 'forward' ? this.currentPage : pageIndex;
        this.isAnimating = true;
        this.currentPage = pageIndex;
        this.markBookAnimation(direction);
        this.markFlipAnimation(animationPageIndex, direction);
        this.updatePages();
        this.playFlipSound(direction);

        setTimeout(() => {
            this.isAnimating = false;
        }, this.animationDuration);
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
