/**
 * UI Initiative Stories Slider 1.0.0
 *
 * Instagram-like Stories Slider Made With Swiper
 *
 * https://uiinitiative.com
 *
 * Copyright 2022-2024 UI Initiative
 *
 * Released under the UI Initiative Regular License
 *
 * Released on: September 12, 2024
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.createStoriesSlider = factory());
})(this, (function () { 'use strict';

  /* eslint-disable no-shadow */
  function createStoriesSlider(el, params = {}) {
    const mainSwiperEl = el.querySelector('.swiper');
    const {
      autoplayDuration = 5000,
      Swiper,
      EffectCube,
      Virtual,
      virtual,
      onSlidesIndexesChange,
      onAutoplayStart,
      onAutoplayStop,
      onEnd,
    } = params;
    let { enabled = true } = params;

    let activeSubSwiperIndex = 0;

    let mainSwiper;
    let videoRaf;
    const subSwipers = [];

    let slideIndexesChangeRaf;

    let isTouched;
    let touchStartTime;
    let touchStartTimeout;
    let touchHoldDuration;
    let autoplayStartTime;
    let autoplayTimeLeft;
    let autoplayTouchPaused;
    let externalPaused;

    const isVirtual = (swiper) =>
      typeof swiper === 'undefined'
        ? virtual || typeof Virtual !== 'undefined'
        : swiper.virtual && swiper.params.virtual.enabled;

    const getSlideElByIndex = (swiper, index) =>
      isVirtual(swiper)
        ? swiper.slides.find(
            (el) => el.getAttribute('data-swiper-slide-index') === String(index),
          )
        : swiper.slides[index];

    const startAutoplay = (swiper, durationForce) => {
      const subSwiperIndex = subSwipers.indexOf(swiper);
      if (subSwiperIndex === -1) {
        return 0;
      }
      let duration =
        typeof durationForce === 'undefined' ? autoplayDuration : durationForce;
      const currentSlideEl = getSlideElByIndex(swiper, swiper.activeIndex);

      let currentSlideDuration =
        currentSlideEl &&
        parseInt(currentSlideEl.getAttribute('data-duration'), 10);
      const videoEl = currentSlideEl && currentSlideEl.querySelector('video');
      if (Number.isNaN(currentSlideDuration) && videoEl) {
        currentSlideDuration = videoEl.duration * 1000;
      }
      if (
        !Number.isNaN(currentSlideDuration) &&
        currentSlideDuration > 0 &&
        typeof durationForce === 'undefined'
      ) {
        duration = currentSlideDuration;
      }
      autoplayTimeLeft = duration;

      swiper.storiesSliderAutoplayTimeout = setTimeout(() => {
        if (!swiper.isEnd) {
          swiper.slideNext();
        } else {
          if (activeSubSwiperIndex !== subSwiperIndex) {
            return;
          }
          if (!mainSwiper.isEnd) {
            mainSwiper.slideNext();
          } else if (onEnd) onEnd();
        }
      }, duration);

      if (onAutoplayStart) onAutoplayStart(swiper);
      return duration;
    };
    const playVideo = (videoEl) => {
      videoRaf = requestAnimationFrame(() => {
        const playButtonContainerEl =
          videoEl && videoEl.parentElement && videoEl.parentElement.parentElement;
        videoEl.play();
        if (!playButtonContainerEl) return;
        if (videoEl.paused) {
          // eslint-disable-next-line
          pause();
          const playButton = document.createElement('div');
          playButton.classList.add('stories-slider-play-button');
          playButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';
          playButtonContainerEl.append(playButton);
          playButton.addEventListener('click', () => {
            playButton.remove();
            videoEl.play();
            // eslint-disable-next-line
            resume();
          });
        } else {
          const playButton = playButtonContainerEl.querySelector(
            '.stories-slider-play-button',
          );
          if (playButton) playButton.remove();
        }
      });
    };
    const stopAutoplay = (swiper) => {
      clearTimeout(swiper.storiesSliderAutoplayTimeout);
      if (onAutoplayStop) onAutoplayStop(swiper);
    };
    const pauseAutoplay = (swiper) => {
      stopAutoplay(swiper);
      const currentSlideEl = getSlideElByIndex(swiper, swiper.activeIndex);
      // find current video
      const videoEl = currentSlideEl && currentSlideEl.querySelector('video');
      if (videoEl) {
        cancelAnimationFrame(videoRaf);
        videoEl.pause();
      }
      const duration = autoplayTimeLeft || autoplayDuration;
      let currentSlideDuration =
        currentSlideEl &&
        parseInt(currentSlideEl.getAttribute('data-duration'), 10);
      if (Number.isNaN(currentSlideDuration)) currentSlideDuration = undefined;
      if (!currentSlideDuration && videoEl) {
        currentSlideDuration = videoEl.duration * 1000;
      }
      autoplayTimeLeft = duration - (new Date().getTime() - autoplayStartTime);
      if (swiper.isEnd && autoplayTimeLeft < 0) return;
      if (autoplayTimeLeft < 0) autoplayTimeLeft = 0;

      const calcTranslate =
        1 - autoplayTimeLeft / (currentSlideDuration || autoplayDuration);
      const currentBullet = swiper.el.querySelector(
        `.stories-slider-pagination-bullet:nth-child(${swiper.activeIndex + 1})`,
      );

      currentBullet.querySelector('span').remove();
      currentBullet.insertAdjacentHTML(
        'beforeend',
        `<span style="transform:translateX(${
        -100 + calcTranslate * 100
      }%)"></span>`,
      );
    };
    const resumeAutoPlay = (swiper) => {
      if (swiper.isEnd && autoplayTimeLeft < 0) return;
      autoplayStartTime = new Date().getTime();

      startAutoplay(swiper, autoplayTimeLeft);
      const currentSlideEl = getSlideElByIndex(swiper, swiper.activeIndex);
      // find current video
      const videoEl = currentSlideEl && currentSlideEl.querySelector('video');
      if (videoEl) {
        try {
          playVideo(videoEl);
        } catch (err) {
          // error
        }
      }
      const bullet = swiper.el.querySelector(
        `.stories-slider-pagination-bullet:nth-child(${
        swiper.activeIndex + 1
      }) > span`,
      );

      bullet.style.transform = 'translateX(0%)';
      bullet.style.transitionDuration = `${autoplayTimeLeft}ms`;
    };

    const onSubSwiperSlideChange = (swiper) => {
      stopAutoplay(swiper);
      startAutoplay(swiper);
      autoplayStartTime = new Date().getTime();

      // eslint-disable-next-line
      initSubSwiperNavigation(swiper.el, swiper);

      const removeBullet = swiper.el.querySelector(
        '.stories-slider-pagination-bullet-current',
      );
      if (removeBullet) {
        removeBullet.classList.remove('stories-slider-pagination-bullet-current');
      }

      const currentBullet = swiper.el.querySelector(
        `.stories-slider-pagination-bullet:nth-child(${swiper.activeIndex + 1})`,
      );
      const currentSlideEl = getSlideElByIndex(swiper, swiper.activeIndex);
      // find current video
      const videoEl = currentSlideEl && currentSlideEl.querySelector('video');

      cancelAnimationFrame(videoRaf);

      if (videoEl) {
        videoEl.currentTime = 0;
        try {
          playVideo(videoEl);
        } catch (err) {
          // error
        }
      }
      // find other videos
      swiper.slides.forEach((slideEl) => {
        slideEl.querySelectorAll('video').forEach((vEl) => {
          if (vEl === videoEl) return;
          vEl.currentTime = 0;
          if (!videoEl) {
            cancelAnimationFrame(videoRaf);
          }
          vEl.pause();
        });
      });

      subSwipers
        .filter((s, index) => index !== activeSubSwiperIndex)
        .forEach((s) => {
          s.el.querySelectorAll('video').forEach((vEl) => {
            if (!videoEl) {
              cancelAnimationFrame(videoRaf);
            }
            vEl.pause();
          });
        });
      const allBullets = [...currentBullet.parentElement.children];
      const prevBullets = [...allBullets].filter(
        (el, index) => index < allBullets.indexOf(currentBullet),
      );
      const nextBullets = [...allBullets].filter(
        (el, index) => index > allBullets.indexOf(currentBullet),
      );
      // prev bullets
      prevBullets.forEach((el) => {
        el.classList.add('stories-slider-pagination-bullet-viewed');
        el.querySelectorAll('span').forEach((e) => e.remove());
        el.insertAdjacentHTML('beforeend', '<span></span>');
      });

      // next bullets
      nextBullets.forEach((el) => {
        el.classList.remove(
          'stories-slider-pagination-bullet-viewed',
          'stories-slider-pagination-bullet-current',
        );
        el.querySelectorAll('span').forEach((e) => e.remove());
        el.insertAdjacentHTML('beforeend', '<span></span>');
      });

      // current bullet
      currentBullet.classList.remove('stories-slider-pagination-bullet-viewed');
      currentBullet.classList.add('stories-slider-pagination-bullet-current');
      [...currentBullet.children].forEach((el) => el.remove());
      currentBullet.insertAdjacentHTML('beforeend', '<span></span>');

      // eslint-disable-next-line
      currentBullet.clientWidth;
      currentBullet.querySelector('span').style.transform = 'translateX(0%)';
      currentBullet.querySelector(
        'span',
      ).style.transitionDuration = `${autoplayTimeLeft}ms`;

      if (onSlidesIndexesChange) {
        cancelAnimationFrame(slideIndexesChangeRaf);
        slideIndexesChangeRaf = requestAnimationFrame(() => {
          onSlidesIndexesChange(activeSubSwiperIndex, swiper.activeIndex);
        });
      }
    };

    const initMainSwiper = () => {
      const addTransitionClass = () => {
        el.classList.add('stories-slider-animating');
      };
      const removeTransitionClass = () => {
        el.classList.remove('stories-slider-animating');
      };
      const setPerspectiveFix = () => {
        el.classList.add('stories-slider-perspective');
      };
      const removePerspectiveFix = () => {
        el.classList.remove('stories-slider-perspective');
      };
      const mainModules = [];
      if (typeof Virtual !== 'undefined') mainModules.push(Virtual);
      if (typeof EffectCube !== 'undefined') mainModules.push(EffectCube);
      mainSwiper = new window.Swiper(mainSwiperEl, {
        modules: mainModules,
        effect: 'cube',
        speed: 500,
        threshold: 5,
        cubeEffect: {
          shadow: false,
        },
        observer: true,
        virtual: isVirtual(),
        on: {
          transitionStart() {
            removePerspectiveFix();
            addTransitionClass();
          },
          sliderFirstMove() {
            removePerspectiveFix();
          },
          transitionEnd() {
            setPerspectiveFix();
            removeTransitionClass();
          },
          init(mainSwiper) {
            mainSwiper.params.resistanceRatio = 0.5;
            setPerspectiveFix();
          },
          slideChange() {
            // eslint-disable-next-line
            initSubSwipers();
            externalPaused = false;
            const prevSubSwiper = subSwipers[activeSubSwiperIndex];
            activeSubSwiperIndex = mainSwiper.activeIndex;
            const currentSubSwiper = subSwipers[activeSubSwiperIndex];
            stopAutoplay(prevSubSwiper);
            startAutoplay(currentSubSwiper);
            onSubSwiperSlideChange(currentSubSwiper);
          },
        },
      });
    };

    const initSubSwiperPagination = (subSwiperEl, swiper) => {
      const slidesLength =
        swiper && isVirtual(swiper)
          ? swiper.virtual.slides.length
          : swiper
          ? swiper.slides.length
          : subSwiperEl.querySelectorAll('.swiper-slide').length;

      const paginationContainerEl = document.createElement('div');
      paginationContainerEl.classList.add('stories-slider-pagination');

      for (let i = 0; i < slidesLength; i += 1) {
        const paginationBulletEl = document.createElement('div');
        paginationBulletEl.classList.add('stories-slider-pagination-bullet');
        paginationBulletEl.appendChild(document.createElement('span'));
        paginationContainerEl.appendChild(paginationBulletEl);
      }

      subSwiperEl.appendChild(paginationContainerEl);
    };
    const destroySubSwiperPagination = (swiper) => {
      swiper.el
        .querySelectorAll(
          '.stories-slider-pagination, .stories-slider-pagination-bullet',
        )
        .forEach((el) => el.remove()); // eslint-disable-line
    };
    const initSubSwiperNavigation = (subSwiperEl, swiper) => {
      const slides = subSwiperEl.querySelectorAll('.swiper-slide');

      slides.forEach((slideEl) => {
        if (slideEl.querySelector('.stories-slider-button-prev')) {
          return;
        }
        const navLeftEl = document.createElement('div');
        const navRightEl = document.createElement('div');

        navLeftEl.classList.add(
          'stories-slider-button',
          'stories-slider-button-prev',
        );
        navRightEl.classList.add(
          'stories-slider-button',
          'stories-slider-button-next',
        );

        slideEl.appendChild(navLeftEl);
        slideEl.appendChild(navRightEl);

        const onNavLeftClick = () => {
          if (touchHoldDuration > 200) return;
          if (swiper.isBeginning) {
            mainSwiper.slidePrev();
            return;
          }
          swiper.slidePrev();
        };
        const onNavRightClick = () => {
          if (touchHoldDuration > 200) return;
          if (swiper.isEnd) {
            mainSwiper.slideNext();
            return;
          }
          swiper.slideNext();
        };

        navLeftEl.addEventListener('click', onNavLeftClick);
        navRightEl.addEventListener('click', onNavRightClick);
      });
    };

    const destroySubSwiperNavigation = (swiper) => {
      swiper.el
        .querySelectorAll('.stories-slider-button')
        .forEach((el) => el.remove());
    };
    const initSubSwipers = () => {
      el.querySelectorAll('.swiper .swiper').forEach(
        (subSwiperEl, subSwiperIndex) => {
          subSwiperIndex = isVirtual()
            ? parseInt(
                subSwiperEl
                  .closest('.swiper-slide')
                  .getAttribute('data-swiper-slide-index'),
                10,
              )
            : subSwiperIndex;

          if (subSwiperEl.swiper) return; // already initialized

          const swiper = new window.Swiper(subSwiperEl, {
            modules: typeof Virtual !== 'undefined' ? [Virtual] : [],
            speed: 1,
            nested: true,
            allowTouchMove: false,
            observer: true,
            virtual: isVirtual(),
            on: {
              touchStart(swiper) {
                if (externalPaused) return;
                isTouched = true;
                autoplayTouchPaused = false;
                touchStartTime = new Date().getTime();
                touchStartTimeout = setTimeout(() => {
                  autoplayTouchPaused = true;
                  pauseAutoplay(swiper);
                }, 200);
              },
              touchEnd(swiper) {
                if (externalPaused) return;
                clearTimeout(touchStartTimeout);
                if (activeSubSwiperIndex !== subSwiperIndex) return;
                if (!isTouched) {
                  return;
                }
                touchHoldDuration = new Date().getTime() - touchStartTime;
                if (autoplayTouchPaused) resumeAutoPlay(swiper);
                autoplayTouchPaused = false;
                isTouched = false;
              },
              init(swiper) {
                if (!enabled) return;
                if (activeSubSwiperIndex !== subSwiperIndex) {
                  stopAutoplay(swiper);
                } else {
                  requestAnimationFrame(() => {
                    onSubSwiperSlideChange(swiper);
                  });
                }
              },
              slideChange(swiper) {
                externalPaused = false;
                onSubSwiperSlideChange(swiper);
              },
            },
          });

          initSubSwiperPagination(subSwiperEl, swiper);

          initSubSwiperNavigation(subSwiperEl, swiper);

          subSwipers[subSwiperIndex] = swiper;
        },
      );
    };

    initMainSwiper();
    initSubSwipers();

    const enable = () => {
      if (enabled) return;
      subSwipers.forEach((subSwiper, subSwiperIndex) => {
        if (subSwiperIndex === activeSubSwiperIndex) {
          onSubSwiperSlideChange(subSwiper);
        }
      });
    };

    const disable = () => {
      enabled = false;
      subSwipers.forEach((subSwiper, subSwiperIndex) => {
        subSwiper.el.querySelectorAll('video').forEach((videoEl) => {
          cancelAnimationFrame(videoRaf);
          videoEl.pause();
        });
        if (subSwiperIndex === activeSubSwiperIndex) {
          pauseAutoplay(subSwiper);
        } else {
          stopAutoplay(subSwiper);
        }
      });
    };

    const destroy = () => {
      if (mainSwiper && mainSwiper.destroy) mainSwiper.destroy();
      subSwipers.forEach((subSwiper) => {
        stopAutoplay(subSwiper);
        destroySubSwiperPagination(subSwiper);
        destroySubSwiperNavigation(subSwiper);
        if (subSwiper.destroy) subSwiper.destroy();
      });
    };

    const slideTo = (mainIndex, subIndex) => {
      if (mainSwiper && mainSwiper.slideTo && !mainSwiper.destroyed) {
        mainSwiper.slideTo(mainIndex, 0);
      }
      if (typeof subIndex !== 'undefined') {
        const subSwiper = subSwipers[mainIndex];
        if (subSwiper.slideTo && !subSwiper.destroyed) {
          if (subSwiper.activeIndex === subIndex) {
            onSubSwiperSlideChange(subSwiper);
          } else {
            subSwiper.slideTo(subIndex, 0);
          }
        }
      }
    };

    const pause = (preventTouchResume = false) => {
      externalPaused = !!preventTouchResume;
      pauseAutoplay(subSwipers[activeSubSwiperIndex]);
    };

    const resume = () => {
      externalPaused = false;
      resumeAutoPlay(subSwipers[activeSubSwiperIndex]);
    };

    return {
      el,
      mainSwiper,
      subSwipers,
      destroy,
      slideTo,
      enable,
      disable,
      pause,
      resume,
    };
  }

  return createStoriesSlider;

}));
//# sourceMappingURL=stories-slider.js.map
