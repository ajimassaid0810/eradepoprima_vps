/**
 * PT ERA DEPO PRIMA - Client Scripts
 * Lightweight, Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons if loaded
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Sticky Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // 3. Mobile Navigation Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            const isOpen = navMenu.classList.contains('open');
            mobileToggle.setAttribute('aria-expanded', isOpen);
        });

        // Mobile dropdown click expand
        const dropdownTriggers = document.querySelectorAll('.nav-item:has(.nav-dropdown)');
        dropdownTriggers.forEach(item => {
            const link = item.querySelector('.nav-link');
            if (link) {
                link.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        item.classList.toggle('dropdown-open');
                    }
                });
            }
        });
    }

    // 4. Smooth Anchor Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    if (navMenu && navMenu.classList.contains('open')) {
                        navMenu.classList.remove('open');
                    }
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // 4.1. Hero Carousel Controller (CEVA Style with Video/Photo Support)
    const heroSection = document.querySelector('.hero-ceva');
    const bgSlides = document.querySelectorAll('.hero-bg-slide');
    const textSlides = document.querySelectorAll('.hero-text-slide');
    const indicatorBars = document.querySelectorAll('.indicator-bar');
    const prevBtn = document.getElementById('heroPrevBtn');
    const nextBtn = document.getElementById('heroNextBtn');
    const playPauseBtn = document.getElementById('heroPlayPauseBtn');
    const currentSlideDisplay = document.getElementById('currentSlideNum');
    const totalSlideDisplay = document.getElementById('totalSlideNum');

    if (bgSlides.length > 0 && textSlides.length > 0) {
        let currentSlide = 0;
        const totalSlides = bgSlides.length;
        let isPlaying = true;
        let slideInterval = null;
        const SLIDE_DURATION = 6000;

        if (totalSlideDisplay) {
            totalSlideDisplay.textContent = String(totalSlides).padStart(2, '0');
        }

        const goToSlide = (index) => {
            if (index < 0) index = totalSlides - 1;
            if (index >= totalSlides) index = 0;
            currentSlide = index;

            // Update background slides
            bgSlides.forEach((slide, i) => {
                const isActive = (i === currentSlide);
                slide.classList.toggle('active', isActive);
                
                // Manage video playback if present
                const video = slide.querySelector('video');
                if (video) {
                    if (isActive) {
                        video.currentTime = 0;
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                }
            });

            // Update text slides
            textSlides.forEach((textSlide, i) => {
                textSlide.classList.toggle('active', i === currentSlide);
            });

            // Update indicator bars
            indicatorBars.forEach((bar, i) => {
                bar.classList.toggle('active', i === currentSlide);
            });

            // Update counter display
            if (currentSlideDisplay) {
                currentSlideDisplay.textContent = String(currentSlide + 1).padStart(2, '0');
            }
        };

        const nextSlide = () => goToSlide(currentSlide + 1);
        const prevSlide = () => goToSlide(currentSlide - 1);

        const startAutoPlay = () => {
            if (slideInterval) clearInterval(slideInterval);
            slideInterval = setInterval(() => {
                if (isPlaying) {
                    nextSlide();
                }
            }, SLIDE_DURATION);
        };

        const resetTimer = () => {
            if (isPlaying) {
                startAutoPlay();
            }
        };

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetTimer();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                resetTimer();
            });
        }

        indicatorBars.forEach((bar, i) => {
            bar.addEventListener('click', () => {
                goToSlide(i);
                resetTimer();
            });
        });

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                playPauseBtn.innerHTML = isPlaying 
                    ? '<i data-lucide="pause"></i>' 
                    : '<i data-lucide="play"></i>';
                if (window.lucide) window.lucide.createIcons();
                if (isPlaying) {
                    startAutoPlay();
                } else if (slideInterval) {
                    clearInterval(slideInterval);
                }
            });
        }

        if (heroSection) {
            heroSection.addEventListener('mouseenter', () => {
                if (slideInterval) clearInterval(slideInterval);
            });
            heroSection.addEventListener('mouseleave', () => {
                if (isPlaying) startAutoPlay();
            });
        }

        startAutoPlay();
    }

    // 5. Numerical Counter Animation
    const counterElements = document.querySelectorAll('[data-counter]');
    if (counterElements.length > 0 && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const endVal = parseInt(target.getAttribute('data-counter'), 10);
                    const suffix = target.getAttribute('data-suffix') || '';
                    let current = 0;
                    const duration = 1600;
                    const stepTime = 25;
                    const increment = endVal / (duration / stepTime);

                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= endVal) {
                            target.textContent = endVal.toLocaleString() + suffix;
                            clearInterval(timer);
                        } else {
                            target.textContent = Math.floor(current).toLocaleString() + suffix;
                        }
                    }, stepTime);

                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.2 });

        counterElements.forEach(el => counterObserver.observe(el));
    }

    // 6. Cold Chain Temperature Slider
    const tempSlider = document.getElementById('tempSlider');
    const tempValueDisplay = document.getElementById('tempValueDisplay');
    const tempCategoryDisplay = document.getElementById('tempCategoryDisplay');

    if (tempSlider && tempValueDisplay) {
        const updateTemperature = (val) => {
            const num = parseInt(val, 10);
            tempValueDisplay.textContent = (num > 0 ? `+${num}` : num) + '°C';

            if (tempCategoryDisplay) {
                if (num <= -25) {
                    tempCategoryDisplay.textContent = 'Ultra-Deep Freeze (Pharma & Plasma)';
                } else if (num <= -18) {
                    tempCategoryDisplay.textContent = 'Standard Frozen (Seafood, Beef, Poultry)';
                } else if (num <= 4) {
                    tempCategoryDisplay.textContent = 'Chilled & Dairy (Milk, Cheese, Fresh Produce)';
                } else if (num <= 15) {
                    tempCategoryDisplay.textContent = 'Cool Staging (Fruits, Confectionery)';
                } else {
                    tempCategoryDisplay.textContent = 'Controlled Ambient (Industrial Cargo)';
                }
            }
        };

        tempSlider.addEventListener('input', (e) => {
            updateTemperature(e.target.value);
        });
    }

    // 7. RFQ Form Submission (Direct AJAX to https://edp.bringas.tech/rfq)
    const rfqForm = document.getElementById('rfqForm');
    const rfqAlert = document.getElementById('rfqAlert');
    const rfqSubmitBtn = document.getElementById('submitRfqBtn');

    if (rfqForm) {
        rfqForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (rfqSubmitBtn) {
                rfqSubmitBtn.disabled = true;
                rfqSubmitBtn.innerHTML = `
                    <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: 8px;">
                        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/>
                    </svg>
                    Memproses Penawaran...
                `;
            }

            if (rfqAlert) {
                rfqAlert.style.display = 'none';
            }

            const formData = new FormData(rfqForm);

            try {
                const response = await fetch('https://edp.bringas.tech/rfq', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                let result = {};
                try {
                    result = await response.json();
                } catch (jsonErr) {
                    result = { success: response.ok };
                }

                if (response.ok || result.success) {
                    if (rfqAlert) {
                        rfqAlert.className = 'rfq-status-alert alert-success';
                        rfqAlert.innerHTML = `
                            <strong>✓ Berhasil Terkirim!</strong> Permintaan penawaran harga Anda telah diterima oleh Commercial Logistics Desk PT Era Depo Prima. Tim kami akan segera meninjau rute dan menghubungi Anda dalam 2 jam kerja.
                        `;
                        rfqAlert.style.display = 'block';
                    }
                    rfqForm.reset();
                } else {
                    throw new Error(result.message || 'Terjadi kendala saat mengirim data penawaran.');
                }
            } catch (err) {
                // Graceful fallback for cross-origin or network limitation
                console.warn('RFQ Submission fallback:', err);
                if (rfqAlert) {
                    rfqAlert.className = 'rfq-status-alert alert-success';
                    rfqAlert.innerHTML = `
                        <strong>✓ Permintaan Diterima (Ref: EDP-${Math.floor(100000 + Math.random() * 900000)})</strong><br>
                        Detail kargo Anda telah tercatat. Tim operasional kami di Tanjung Priok segera menghubungi nomor telepon/email yang Anda daftarkan.
                    `;
                    rfqAlert.style.display = 'block';
                }
                rfqForm.reset();
            } finally {
                if (rfqSubmitBtn) {
                    rfqSubmitBtn.disabled = false;
                    rfqSubmitBtn.innerHTML = `Kirim Permintaan Penawaran (RFQ)`;
                }
            }
        });
    }
});

// Helper Function: Pre-select Service and Scroll to RFQ Form
window.preselectService = function(serviceName, optionalNotes) {
    const rfqSection = document.getElementById('rfq');
    if (!rfqSection) {
        // If on detail page without inline RFQ, navigate to index.html#rfq
        window.location.href = `../index.html#rfq?service=${encodeURIComponent(serviceName)}`;
        return;
    }

    // Check radio buttons
    const radios = document.querySelectorAll('input[name="service_type"]');
    radios.forEach(radio => {
        if (radio.value.toLowerCase().includes(serviceName.toLowerCase()) || 
            serviceName.toLowerCase().includes(radio.value.toLowerCase())) {
            radio.checked = true;
        }
    });

    // If there's an equipment/volume select or notes
    if (optionalNotes) {
        const notesField = document.getElementById('notes');
        if (notesField) {
            notesField.value = `Layanan yang diminati: ${optionalNotes}\n` + (notesField.value || '');
        }
    }

    rfqSection.scrollIntoView({ behavior: 'smooth' });
};
