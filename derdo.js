
        (() => {
            const music = document.getElementById("backgroundMusic");
            const control = document.getElementById("soundControl");
            const button = document.getElementById("soundButton");
            const label = document.getElementById("soundLabel");
            const waves = document.getElementById("soundWaves");
            const cross = document.getElementById("soundCross");
            const toast = document.getElementById("soundToast");

            let userMuted = false;
            let waitingForInteraction = true;
            let toastTimer;
            let lastState = "";

            // Her yeni sayfa açılışında ses açık ve seviye %60.
            music.volume = 0.6;
            music.muted = false;

            function notify(message) {
                clearTimeout(toastTimer);
                toast.textContent = message;
                toast.classList.add("visible");

                toastTimer = setTimeout(() => {
                    toast.classList.remove("visible");
                }, 3000);
            }

            function render(state, showNotification = true) {
                const states = {
                    on: {
                        text: "Ses açık",
                        action: "Sesi kapat",
                        message: "🔊 Ses açık"
                    },
                    off: {
                        text: "Ses kapalı",
                        action: "Sesi aç",
                        message: "🔇 Ses kapalı"
                    },
                    waiting: {
                        text: "Başlatmak için sayfaya dokun",
                        action: "Müziği başlat",
                        message: "Müziğin başlaması için sayfanın herhangi bir yerine dokun."
                    },
                    loading: {
                        text: "Müzik yükleniyor…",
                        action: "Sesi kapat",
                        message: "Müzik yükleniyor…"
                    },
                    error: {
                        text: "Müzik yüklenemedi",
                        action: "Yeniden dene",
                        message: "alla-beni.mp3 dosyası yüklenemedi."
                    }
                };

                const info = states[state];
                control.dataset.state = state;
                label.textContent = info.text;
                button.title = info.action;
                button.setAttribute("aria-label", info.action);

                waves.toggleAttribute("hidden", state !== "on");
                cross.toggleAttribute("hidden", state === "on");

                if (showNotification && state !== lastState) {
                    notify(info.message);
                }

                lastState = state;
            }

            function syncState() {
                if (music.error) {
                    render("error");
                } else if (userMuted || music.muted) {
                    render("off");
                } else if (!music.paused && music.readyState >= 3) {
                    render("on");
                } else if (waitingForInteraction) {
                    render("waiting");
                } else {
                    render("loading", false);
                }
            }

            async function startMusic() {
                if (userMuted) return;

                music.muted = false;

                try {
                    await music.play();
                    waitingForInteraction = false;
                    syncState();
                } catch (error) {
                    if (userMuted) {
                        render("off");
                    } else if (error.name === "NotAllowedError") {
                        waitingForInteraction = true;
                        render("waiting");
                    } else if (error.name !== "AbortError") {
                        render("error");
                    }
                }
            }

            button.addEventListener("click", () => {
                if (music.error) {
                    userMuted = false;
                    music.load();
                    startMusic();
                    return;
                }

                if (userMuted || music.muted) {
                    userMuted = false;
                    music.muted = false;

                    if (music.paused) {
                        startMusic();
                    } else {
                        syncState();
                    }
                    return;
                }

                if (music.paused) {
                    startMusic();
                    return;
                }

                // Şarkı ilerlemeye devam eder; yalnızca ses kapanır.
                userMuted = true;
                music.muted = true;
                render("off");
            });

            function firstInteraction(event) {
                // Düğmeye basılması, sesi kapattıktan sonra tekrar açmaz.
                if (button.contains(event.target)) return;
                if (event.type === "keydown" && event.repeat) return;

                if (waitingForInteraction && !userMuted) {
                    startMusic();
                }
            }

            document.addEventListener("click", firstInteraction);
            document.addEventListener("keydown", firstInteraction);

            music.addEventListener("playing", () => {
                waitingForInteraction = false;
                syncState();
            });

            music.addEventListener("volumechange", syncState);
            music.addEventListener("pause", syncState);

            music.addEventListener("waiting", () => {
                if (!userMuted && !waitingForInteraction) {
                    render("loading", false);
                }
            });

            music.addEventListener("error", () => {
                render("error");
            });

            render("loading", false);

            // Görsellerin yüklenmesini beklemeden sesli başlatmayı dene.
            startMusic();
        })();
    
;

(() => {
    const background = document.querySelector(".bg-container");
    const cursor = document.getElementById("starCursor");
    const canvas = document.getElementById("starTrail");
    const context = canvas.getContext("2d");

    if (!background || !context) return;

    const desktop = matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    let particles = [];
    let frame = null;
    let previous = null;
    let lastTime = 0;

    function resize() {
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(innerWidth * scale);
        canvas.height = Math.round(innerHeight * scale);
        canvas.style.width = innerWidth + "px";
        canvas.style.height = innerHeight + "px";
        context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function drawStar(x, y, size, rotation) {
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.beginPath();

        for (let point = 0; point < 8; point++) {
            const angle = point * Math.PI / 4;
            const radius = point % 2 === 0 ? size : size * 0.28;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;

            if (point === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }

        context.closePath();
        context.fill();
        context.restore();
    }

    function animate(time) {
        const delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        context.clearRect(0, 0, innerWidth, innerHeight);

        particles = particles.filter(particle => {
            particle.life -= delta;
            if (particle.life <= 0) return false;

            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.rotation += delta;

            const fade = particle.life / particle.duration;
            context.globalAlpha = fade;
            context.fillStyle = "#ffe5a5";
            context.shadowColor = "#ffc76a";
            context.shadowBlur = 8;

            drawStar(
                particle.x,
                particle.y,
                particle.size * fade,
                particle.rotation
            );

            return true;
        });

        context.globalAlpha = 1;

        if (particles.length) {
            frame = requestAnimationFrame(animate);
        } else {
            frame = null;
        }
    }

    function addParticle(x, y) {
        const duration = 0.35 + Math.random() * 0.3;

        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 16,
            vy: 12 + Math.random() * 18,
            size: 2 + Math.random() * 4,
            rotation: Math.random() * Math.PI,
            duration,
            life: duration
        });

        if (particles.length > 160) particles.shift();

        if (frame === null) {
            lastTime = performance.now();
            frame = requestAnimationFrame(animate);
        }
    }

    function hideEffects() {
        document.documentElement.classList.remove("star-cursor-active");
        background.classList.remove("spotlight-active");
        cursor.style.opacity = "0";
        previous = null;
        particles = [];

        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        context.clearRect(0, 0, innerWidth, innerHeight);
    }

    document.addEventListener("pointermove", event => {
        if (!desktop.matches || event.pointerType === "touch") {
            hideEffects();
            return;
        }

        const x = event.clientX;
        const y = event.clientY;
        const bounds = background.getBoundingClientRect();

        document.documentElement.classList.add("star-cursor-active");
        background.classList.add("spotlight-active");
        background.style.setProperty("--mouse-x", (x - bounds.left) + "px");
        background.style.setProperty("--mouse-y", (y - bounds.top) + "px");

        cursor.style.opacity = "1";
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;

        if (previous && !reducedMotion.matches) {
            const dx = x - previous.x;
            const dy = y - previous.y;
            const distance = Math.hypot(dx, dy);

            if (distance >= 3) {
                const count = Math.min(12, Math.ceil(distance / 7));

                for (let i = 1; i <= count; i++) {
                    addParticle(
                        previous.x + dx * i / count,
                        previous.y + dy * i / count
                    );
                }
            }
        }

        previous = { x, y };
    }, { passive: true });

    document.documentElement.addEventListener("pointerleave", hideEffects);
    window.addEventListener("blur", hideEffects);
    window.addEventListener("resize", resize);
    desktop.addEventListener("change", hideEffects);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) hideEffects();
    });

    resize();
})();

;

(() => {
    const scene = document.querySelector(".bg-container");

    // Yanlışlıkla iki kere eklenirse efekti çoğaltmaz.
    if (!scene || scene.querySelector(".cinema-background")) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const originalBackground = getComputedStyle(scene).backgroundImage;

    if (!originalBackground || originalBackground === "none") return;

    const background = document.createElement("div");
    background.className = "cinema-background";
    background.setAttribute("aria-hidden", "true");

    const picture = document.createElement("div");
    picture.className = "cinema-image";
    picture.style.backgroundImage = originalBackground;

    background.appendChild(picture);
    scene.prepend(background);

    // Aynı İstanbul görseli artık bağımsız katmanda hareket eder.
    scene.style.backgroundImage = "none";

    /* Açılış animasyonları başlığın mevcut neonunu değiştirmez. */
    const entranceAnimations = [];

    function reveal(element, delay, distance) {
        if (!element || reduceMotion.matches || !element.animate) return;

        entranceAnimations.push(
            element.animate(
                [
                    {
                        opacity: 0,
                        transform: `translateY(${distance}px)`
                    },
                    {
                        opacity: 1,
                        transform: "translateY(0)"
                    }
                ],
                {
                    duration: 1000,
                    delay,
                    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                    fill: "backwards"
                }
            )
        );
    }

    reveal(scene.querySelector(".overlay-text"), 180, 16);
    reveal(scene.querySelector(".social-buttons"), 380, 12);

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = null;
    let previousTime = 0;

    function motionAllowed() {
        return finePointer.matches && !reduceMotion.matches;
    }

    function animate(time) {
        const elapsed = previousTime
            ? Math.min(time - previousTime, 50)
            : 16;

        previousTime = time;

        // Ekranın yenileme hızından bağımsız, yumuşak takip.
        const smoothing = 1 - Math.exp(-elapsed / 150);

        currentX += (targetX - currentX) * smoothing;
        currentY += (targetY - currentY) * smoothing;

        const settled =
            Math.abs(targetX - currentX) < 0.02 &&
            Math.abs(targetY - currentY) < 0.02;

        if (settled) {
            currentX = targetX;
            currentY = targetY;
        }

        picture.style.transform =
            `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

        if (!settled) {
            frame = requestAnimationFrame(animate);
        } else {
            // Fare durduğunda gereksiz animasyon çalışmaz.
            frame = null;
            previousTime = 0;
        }
    }

    function schedule() {
        if (frame === null) {
            frame = requestAnimationFrame(animate);
        }
    }

    scene.addEventListener("pointermove", event => {
        if (!motionAllowed() || event.pointerType === "touch") return;

        const bounds = scene.getBoundingClientRect();

        const x = Math.max(
            -1,
            Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)
        );

        const y = Math.max(
            -1,
            Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)
        );

        // Küçük hareket: yazılar ve butonlar sabit kalır.
        targetX = -x * 10;
        targetY = -y * 7;

        schedule();
    }, { passive: true });

    function returnToCenter() {
        targetX = 0;
        targetY = 0;
        schedule();
    }

    function resetMotion() {
        if (frame !== null) cancelAnimationFrame(frame);

        frame = null;
        previousTime = 0;
        targetX = targetY = currentX = currentY = 0;
        picture.style.transform = "translate3d(0, 0, 0)";
    }

    scene.addEventListener("pointerleave", returnToCenter);
    window.addEventListener("blur", resetMotion);
    finePointer.addEventListener("change", resetMotion);

    reduceMotion.addEventListener("change", () => {
        resetMotion();

        if (reduceMotion.matches) {
            entranceAnimations.forEach(animation => animation.cancel());
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) resetMotion();
    });
})();

;

(() => {
    const picture = document.querySelector(".cinema-image");
    const mobile = matchMedia("(pointer: coarse)");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    if (
        !picture ||
        !mobile.matches ||
        reducedMotion.matches ||
        !window.DeviceOrientationEvent
    ) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "motion-enable";
    button.textContent = "Hareketi etkinleştir";
    document.body.appendChild(button);

    let baseBeta = null;
    let baseGamma = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = null;
    let lastTime = 0;
    let listening = false;
    let receivedData = false;
    let timeout;

    const clamp = (value, min, max) =>
        Math.max(min, Math.min(max, value));

    function animate(time) {
        const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16;
        lastTime = time;

        const smoothing = 1 - Math.exp(-elapsed / 180);
        currentX += (targetX - currentX) * smoothing;
        currentY += (targetY - currentY) * smoothing;

        const settled =
            Math.abs(targetX - currentX) < 0.02 &&
            Math.abs(targetY - currentY) < 0.02;

        if (settled) {
            currentX = targetX;
            currentY = targetY;
        }

        picture.style.transform =
            `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

        if (settled) {
            frame = null;
            lastTime = 0;
        } else {
            frame = requestAnimationFrame(animate);
        }
    }

    function schedule() {
        if (frame === null) frame = requestAnimationFrame(animate);
    }

    function onOrientation(event) {
        if (
            document.hidden ||
            reducedMotion.matches ||
            !mobile.matches ||
            !Number.isFinite(event.beta) ||
            !Number.isFinite(event.gamma)
        ) return;

        receivedData = true;
        clearTimeout(timeout);
        button.hidden = true;

        // Telefonun ilk tutulduğu konumu merkez kabul et.
        if (baseBeta === null) {
            baseBeta = event.beta;
            baseGamma = event.gamma;
        }

        const betaDifference =
            ((event.beta - baseBeta + 540) % 360) - 180;

        const gammaDifference = event.gamma - baseGamma;

        const angle = (
            window.screen.orientation?.angle ??
            window.orientation ??
            0
        ) * Math.PI / 180;

        // Dikey ve yatay ekran yönüne uyum sağlar.
        const horizontal =
            gammaDifference * Math.cos(angle) +
            betaDifference * Math.sin(angle);

        const vertical =
            betaDifference * Math.cos(angle) -
            gammaDifference * Math.sin(angle);

        targetX = -clamp(horizontal / 18, -1, 1) * 12;
        targetY = -clamp(vertical / 18, -1, 1) * 9;

        schedule();
    }

    function reset() {
        baseBeta = null;
        baseGamma = null;
        targetX = targetY = currentX = currentY = 0;

        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;

        picture.style.transform = "translate3d(0, 0, 0)";
    }

    function listen() {
        if (!listening) {
            window.addEventListener(
                "deviceorientation",
                onOrientation,
                { passive: true }
            );
            listening = true;
        }

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (!receivedData) {
                button.hidden = false;
                button.disabled = false;
                button.textContent = "Sensör alınamadı · Yeniden dene";
            }
        }, 5000);
    }

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Sensör bekleniyor…";

        try {
            // İzin isteyen cihazlarda doğrudan kullanıcı tıklamasıyla çalışır.
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                const result =
                    await DeviceOrientationEvent.requestPermission();

                if (result !== "granted") {
                    button.textContent = "Sensör izni verilmedi";
                    button.disabled = false;
                    return;
                }
            }

            listen();
        } catch (error) {
            button.textContent = "Hareket etkinleştirilemedi";
            button.disabled = false;
        }
    });

    // İzin penceresi gerektirmeyen cihazlarda kendiliğinden dene.
    if (typeof DeviceOrientationEvent.requestPermission !== "function") {
        button.hidden = true;
        listen();
    }

    window.addEventListener("orientationchange", reset);
    window.screen.orientation?.addEventListener("change", reset);

    document.addEventListener("visibilitychange", reset);

    reducedMotion.addEventListener("change", () => {
        reset();
        button.hidden = reducedMotion.matches || receivedData;
    });

    mobile.addEventListener("change", () => {
        reset();
        button.hidden = !mobile.matches || receivedData;
    });
})();
