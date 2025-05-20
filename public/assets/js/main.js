/**
 * Stories Slider element
 */
const storiesSliderEl = document.querySelector('.stories-slider');

/**
 * Init Stories Slider
 *
 * argument: pass .stories-slider element and parameters
 */
const storiesSlider = window.createStoriesSlider(storiesSliderEl, {
  /*
   * Pass Swiper function so it can create swipers with new Swiper()
   */
  Swiper: window.Swiper,
  /*
   * Autoplay duration to switch story every 5 seconds
   */
  autoplayDuration: 5000,
  /*
   * We pass here false as initially our stories slider is hidden and we don't need it to autoplay stories while it is hidden
   */
  enabled: false,
  /*
   * We can pass callback function that will be called on each slide change with current main slider index (index of user with stories) and current sub slider index (index of user's specific story)
   */
  onSlidesIndexesChange(mainIndex, subIndex) {
    // eslint-disable-next-line
    console.log({ mainIndex, subIndex });
  },
  onEnd() {
    // disable on last story ended
    storiesSlider.disable();
    storiesSliderEl.classList.add('stories-slider-out');
  },
});

// open specific user's stories on demo app header stories click
document.querySelectorAll('.demo-stories a').forEach((userEl, userIndex) => {
  userEl.addEventListener('click', (e) => {
    e.preventDefault();
    // add "in" class (used in demo for animated appearance)
    storiesSliderEl.classList.add('stories-slider-in');
    // enable slider (as we passed enabled: false initially)
    storiesSlider.enable();
    // slide to specific user's stories
    storiesSlider.slideTo(userIndex, 0);
  });
});

// open specific user's stories on post avatar click
document.querySelectorAll('.demo-post-avatar').forEach((avatarEl) => {
  const userIndex = parseInt(avatarEl.getAttribute('data-user-index'), 10);
  avatarEl.addEventListener('click', (e) => {
    e.preventDefault();
    // add "in" class (used in demo for animated appearance)
    storiesSliderEl.classList.add('stories-slider-in');
    // enable slider (as we passed enabled: false initially)
    storiesSlider.enable();
    // slide to specific user's stories
    storiesSlider.slideTo(userIndex, 0);
  });
});

// stories slider close handler
storiesSliderEl.addEventListener('click', (e) => {
  // if we clicked at "stories-slider-close-button"
  if (e.target.matches('.stories-slider-close-button')) {
    // disable slider as we don't need it autoplay stories while it is hidden
    storiesSlider.disable();
    // add "out" class (used in demo for animated disappearance)
    storiesSliderEl.classList.add('stories-slider-out');
  }
});

// when slider became hidden we need to remove "in" and "out" class to return it initial state
storiesSliderEl.addEventListener('animationend', () => {
  if (storiesSliderEl.classList.contains('stories-slider-out')) {
    storiesSliderEl.classList.remove('stories-slider-in');
    storiesSliderEl.classList.remove('stories-slider-out');
  }
});
