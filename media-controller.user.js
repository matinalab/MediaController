// ==UserScript==
// @name         MediaController
// @namespace    https://github.com/matinalab/MediaController
// @version      0.4.3
// @description  Keyboard controls for HTML5 media playback.
// @match        *://*/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231f2937'/%3E%3Cpath d='M18 44V20l22 12-22 12Z' fill='%23fff'/%3E%3Cpath d='M43 18h5v28h-5z' fill='%2393c5fd'/%3E%3C/svg%3E
// @downloadURL  https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js
// @updateURL    https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js
// @license      MIT
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict'

  const PLAYBACK_RATE_STORAGE_KEY = '_media_controller_playback_rate_'
  const LAST_PLAYBACK_RATE_STORAGE_KEY = '_media_controller_last_playback_rate_'
  const VOLUME_STORAGE_KEY = '_media_controller_volume_'
  const LEGACY_STORAGE_KEYS = {
    playbackRate: '_media_speed_controller_playback_rate_',
    lastPlaybackRate: '_media_speed_controller_last_playback_rate_',
    volume: '_media_speed_controller_volume_'
  }
  const MIN_RATE = 0.1
  const MAX_RATE = 16
  const MAX_VOLUME = 6
  const PLAYBACK_RATE_STEP = 0.1
  const VOLUME_STEP = 0.05
  const FAST_VOLUME_STEP = 0.2
  const FEEDBACK_TEXT = /^zh\b/i.test(navigator.language || '')
    ? { speed: '播放速度：', volume: '音量：' }
    : { speed: 'Speed: ', volume: 'Volume: ' }
  const SITE_CONTROL_TASKS = [
    {
      domain: 'youtube.com',
      fullScreen: ['button.ytp-fullscreen-button'],
      next: ['.ytp-next-button']
    },
    {
      domain: 'netflix.com',
      fullScreen: ['button.button-nfplayerFullscreen']
    },
    {
      domain: 'bilibili.com',
      fullScreen: [
        '.bpx-player-ctrl-full',
        '.squirtle-video-fullscreen',
        '.bilibili-player-video-btn-fullscreen',
        'button[name="fullscreen-button"]',
        '.bilibili-live-player-video-controller-fullscreen-btn button'
      ],
      next: [
        '.bpx-player-ctrl-next',
        '.squirtle-video-next',
        '.bilibili-player-video-btn-next',
        '.bpx-player-ctrl-btn[aria-label="下一个"]'
      ]
    },
    { domain: 'acfun.cn', fullScreen: ['[data-bind-key="screenTip"]'] },
    {
      domain: 'ixigua.com',
      fullScreen: [
        'xg-fullscreen.xgplayer-fullscreen',
        '.xgplayer-control-item__entry[aria-label="全屏"]',
        '.xgplayer-control-item__entry[aria-label="退出全屏"]'
      ]
    },
    { domain: 'tv.sohu.com', fullScreen: ['button[data-title="网页全屏"]'] },
    {
      domain: 'iqiyi.com',
      fullScreen: ['.iqp-btn-fullscreen'],
      next: ['.iqp-btn-next']
    },
    {
      domain: 'youku.com',
      fullScreen: ['.control-fullscreen-icon'],
      next: ['.control-next-video']
    },
    { domain: 'ted.com', fullScreen: ['button.Fullscreen'] },
    {
      domain: 'qq.com',
      fullScreen: ['txpdiv[data-report="window-fullscreen"]'],
      next: ['txpdiv[data-report="play-next"]']
    },
    { domain: 'pan.baidu.com', fullScreen: ['.vjs-fullscreen-control'] },
    {
      domain: 'facebook.com',
      fullScreen: media => {
        const buttons = media.parentNode && media.parentNode.querySelectorAll('button')
        if (!buttons || buttons.length <= 3) return false
        buttons[buttons.length - 2].click()
        return true
      }
    },
    { domain: 'douyu.com', fullScreen: toggleDouyuFullscreen },
    { domain: 'chaoxing.com', fullScreen: ['.vjs-fullscreen-control'] },
    {
      domain: 'douyin.com',
      fullScreen: ['.xgplayer-fullscreen'],
      next: ['.xgplayer-playswitch-next']
    },
    {
      domain: 'zhihu.com',
      fullScreen: ['button[aria-label="全屏"]', 'button[aria-label="退出全屏"]']
    },
    { domain: 'weibo.com', fullScreen: ['button.wbpv-fullscreen-control'] }
  ]
  const KEY_BINDINGS = [
    { keys: ['c'], run: increasePlaybackRate },
    { keys: ['x'], run: decreasePlaybackRate },
    { keys: ['z'], run: toggleDefaultPlaybackRate },
    { keys: ['arrowup'], run: event => increaseVolume(event.ctrlKey ? FAST_VOLUME_STEP : VOLUME_STEP) },
    { keys: ['arrowdown'], run: event => decreaseVolume(event.ctrlKey ? FAST_VOLUME_STEP : VOLUME_STEP) },
    { keys: ['enter'], run: toggleFullscreen },
    { keys: ['n'], run: playNextVideo }
  ]
  const mediaElements = new Set()
  const mediaAmplifiers = new WeakMap()
  const fullscreenContainers = new WeakMap()
  const mediaVolumeRestoreState = new WeakSet()
  const siteFullscreenStates = new WeakMap()

  let targetPlaybackRate = normalizeRate(readStoredValue(
    PLAYBACK_RATE_STORAGE_KEY,
    LEGACY_STORAGE_KEYS.playbackRate,
    1
  ))
  let lastTargetPlaybackRate = normalizeRate(readStoredValue(
    LAST_PLAYBACK_RATE_STORAGE_KEY,
    LEGACY_STORAGE_KEYS.lastPlaybackRate,
    1.5
  ))
  const storedVolumeLevel = normalizeVolume(readStoredValue(
    VOLUME_STORAGE_KEY,
    LEGACY_STORAGE_KEYS.volume,
    1
  ))
  let currentVolumeLevel = storedVolumeLevel
  let targetNativeVolume = Math.min(storedVolumeLevel, 1)
  let hasStoredVolumePreference = hasStoredValue(VOLUME_STORAGE_KEY)
  let activeMedia = null
  let playbackRateLockUntil = 0
  const volumeLockDeadlines = new WeakMap()
  let isInternalPlaybackRateWrite = false
  let feedbackTimer = 0
  let playbackRateRevision = 0
  let playbackRateRetryTimers = []

  const playbackRateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'playbackRate'
  )
  const volumeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'volume'
  )

  /* MediaElementAmplifier: Copyright 2017 Chris West, MIT License. */
  function MediaAmplifier (mediaElement) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) throw new Error('Web Audio is unavailable')

    try {
      this.context = new AudioContextConstructor()
      this.source = this.context.createMediaElementSource(mediaElement)
      this.gainNode = this.context.createGain()
      this.source.connect(this.gainNode)
      this.gainNode.connect(this.context.destination)
    } catch (error) {
      this.context && this.context.close && this.context.close()
      throw error
    }
  }

  MediaAmplifier.prototype.setLoudness = function (loudness) {
    const decibels = 10 * Math.log2(loudness)
    this.gainNode.gain.value = Math.pow(10, decibels / 20)
  }

  MediaAmplifier.prototype.dispose = function () {
    try { this.source.disconnect() } catch (_) {}
    try { this.gainNode.disconnect() } catch (_) {}
    try { this.context.close && this.context.close() } catch (_) {}
  }

  function normalizeRate (value) {
    value = Number(value)
    if (Number.isNaN(value)) value = 1
    value = Math.min(MAX_RATE, Math.max(MIN_RATE, value))
    return Number(value.toFixed(1))
  }

  function normalizeVolume (value) {
    value = Number(value)
    if (Number.isNaN(value)) value = 1
    value = Math.min(MAX_VOLUME, Math.max(0, value))
    return Number(value.toFixed(2))
  }

  function readStoredValue (key, legacyKey, fallback) {
    try {
      const value = localStorage.getItem(key)
      if (value !== null) return value

      const legacyValue = localStorage.getItem(legacyKey)
      if (legacyValue !== null) {
        localStorage.setItem(key, legacyValue)
        return legacyValue
      }
    } catch (_) {}

    return fallback
  }

  function writeStoredValue (key, value) {
    try {
      localStorage.setItem(key, String(value))
    } catch (_) {}
  }

  function hasStoredValue (key) {
    try {
      return localStorage.getItem(key) !== null
    } catch (_) {
      return false
    }
  }

  function isEditableTarget (target) {
    if (!target) return false

    let node = target.nodeType === Node.TEXT_NODE ? target.parentNode : target
    while (node && node !== document) {
      const tag = String(node.tagName || '').toLowerCase()
      if (node.isContentEditable || ['input', 'textarea', 'select'].includes(tag)) return true
      node = node.parentNode
    }

    return false
  }

  function isMedia (node) {
    return node instanceof HTMLMediaElement
  }

  function isMediaConnected (media) {
    if (!media) return false
    if (typeof media.isConnected === 'boolean') return media.isConnected
    return document.contains(media)
  }

  function isMediaVisibleInViewport (media) {
    if (!isMediaConnected(media) || !media.getBoundingClientRect) return false

    const rect = media.getBoundingClientRect()
    if (!rect.width || !rect.height) return false

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight

    return rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportHeight &&
      rect.left < viewportWidth
  }

  function getSiteControlTask (taskName) {
    const hostname = String(window.location && window.location.hostname || '').toLowerCase()
    const site = SITE_CONTROL_TASKS.find(item => (
      hostname === item.domain || hostname.endsWith('.' + item.domain)
    ))
    return site && site[taskName] ? site[taskName] : []
  }

  function getMediaWrap (media) {
    if (!media || !media.getBoundingClientRect) return null

    const mediaRect = media.getBoundingClientRect()
    let wrap = null
    let parent = media.parentNode
    while (parent && parent !== document && parent.getBoundingClientRect) {
      const parentRect = parent.getBoundingClientRect()
      if (parentRect.width && parentRect.height &&
        parentRect.width === mediaRect.width && parentRect.height === mediaRect.height) {
        wrap = parent
      }
      parent = parent.parentNode
    }
    return wrap
  }

  function runSiteControlTask (taskName, media) {
    const task = getSiteControlTask(taskName)
    if (typeof task === 'function') {
      try {
        return task(media) === true
      } catch (_) {
        return false
      }
    }
    if (!task.length) return false

    const wrap = getMediaWrap(media)

    for (const selector of task) {
      const control = (wrap && wrap.querySelector(selector)) || document.querySelector(selector)
      if (control) {
        control.click()
        return true
      }
    }
    return false
  }

  function toggleDouyuFullscreen (media) {
    const container = getFullscreenContainer(media)
    const isFullscreen = siteFullscreenStates.get(media) === true
    const selector = isFullscreen
      ? 'div[title="退出窗口全屏"]'
      : 'div[title="窗口全屏"]'
    const control = (container && container.querySelector && container.querySelector(selector)) ||
      document.querySelector(selector)
    if (!control) return false

    control.click()
    siteFullscreenStates.set(media, !isFullscreen)
    return true
  }

  function getFullscreenContainer (media) {
    if (fullscreenContainers.has(media)) return fullscreenContainers.get(media)

    const mediaRect = media.getBoundingClientRect()
    let container = media
    let parent = media.parentNode
    while (parent && parent.classList && parent.getBoundingClientRect) {
      if (parent.getAttribute && parent.getAttribute('data-fullscreen-container')) {
        container = parent
        break
      }

      const parentRect = parent.getBoundingClientRect()
      if (parentRect.width <= mediaRect.width && parentRect.height <= mediaRect.height) {
        container = parent
        parent = parent.parentNode
      } else {
        break
      }
    }

    fullscreenContainers.set(media, container)
    return container
  }

  function invokeFullscreenMethod (target, methodNames) {
    const methodName = methodNames.find(name => typeof target[name] === 'function')
    if (!methodName) return false

    try {
      const result = target[methodName]()
      if (result && typeof result.catch === 'function') result.catch(() => {})
      return true
    } catch (_) {
      return false
    }
  }

  function isDocumentFullscreen () {
    return Boolean(
      document.fullscreen ||
      document.webkitIsFullScreen ||
      document.mozFullScreen ||
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    )
  }

  function toggleFullscreen () {
    const media = getActiveMedia()
    if (!media) return false
    if (runSiteControlTask('fullScreen', media)) return true

    if (isDocumentFullscreen()) {
      invokeFullscreenMethod(document, [
        'exitFullscreen',
        'webkitExitFullscreen',
        'mozCancelFullScreen',
        'msExitFullscreen'
      ])
    } else {
      invokeFullscreenMethod(getFullscreenContainer(media), [
        'requestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullScreen',
        'msRequestFullScreen'
      ])
    }
    return true
  }

  function playNextVideo () {
    const media = getActiveMedia()
    if (!media) return false
    runSiteControlTask('next', media)
    return true
  }

  function writeNativePlaybackRate (media, nextRate) {
    if (!media || !playbackRateDescriptor || !playbackRateDescriptor.set) return
    try {
      isInternalPlaybackRateWrite = true
      playbackRateDescriptor.set.call(media, nextRate)
    } catch (_) {
      try {
        media.playbackRate = nextRate
      } catch (_) {}
    } finally {
      isInternalPlaybackRateWrite = false
    }
  }

  function writeNativeVolume (media, nextVolume) {
    if (!media || !volumeDescriptor || !volumeDescriptor.set) return

    try {
      volumeDescriptor.set.call(media, nextVolume)
    } catch (_) {}
  }

  function saveTargetPlaybackRate (nextRate) {
    targetPlaybackRate = normalizeRate(nextRate)
    writeStoredValue(PLAYBACK_RATE_STORAGE_KEY, targetPlaybackRate)
  }

  function lockVolume (media, timeout = 500) {
    volumeLockDeadlines.set(media, Date.now() + timeout)
  }

  function isVolumeLocked (media) {
    return Boolean(media && Date.now() < (volumeLockDeadlines.get(media) || 0))
  }

  function cleanupDetachedMedia () {
    mediaElements.forEach(media => {
      if (isMediaConnected(media)) return

      const amplifier = mediaAmplifiers.get(media)
      if (amplifier && amplifier.dispose) amplifier.dispose()
      mediaAmplifiers.delete(media)
      mediaElements.delete(media)
      if (activeMedia === media) activeMedia = null
    })
  }

  function registerMediaElement (media) {
    if (!isMedia(media) || mediaElements.has(media)) return
    mediaElements.add(media)

    media.addEventListener('play', () => {
      activeMedia = media
      setTargetPlaybackRate(targetPlaybackRate, { silent: true, lock: 400, retry: false, record: false })
    }, true)

    media.addEventListener('loadstart', () => {
      mediaVolumeRestoreState.delete(media)
    }, true)

    media.addEventListener('playing', () => {
      activeMedia = media
      setTargetPlaybackRate(targetPlaybackRate, { silent: true, lock: 1000, retry: false, record: false })
      if (!hasStoredVolumePreference) return
      if (mediaVolumeRestoreState.has(media)) return

      writeNativeVolume(media, targetNativeVolume)
      lockVolume(media)
      mediaVolumeRestoreState.add(media)
    }, true)

    media.addEventListener('mouseenter', () => {
      activeMedia = media
    }, true)

    media.addEventListener('ratechange', () => {
      if (isInternalPlaybackRateWrite) return
      if (Date.now() < playbackRateLockUntil && Math.abs(media.playbackRate - targetPlaybackRate) > 0.01) {
        setTargetPlaybackRate(targetPlaybackRate, { silent: true, lock: 600, retry: false, record: false })
      }
    }, true)

    writeNativePlaybackRate(media, targetPlaybackRate)
  }

  function scanMediaElements (root) {
    if (!root) return
    if (isMedia(root)) registerMediaElement(root)
    if (root.querySelectorAll) {
      root.querySelectorAll('video,audio').forEach(registerMediaElement)
    }
  }

  function getActiveMedia () {
    cleanupDetachedMedia()
    if (activeMedia && isMediaConnected(activeMedia)) return activeMedia

    const candidates = Array.from(mediaElements)
    activeMedia = candidates.find(media => !media.paused) ||
      candidates.find(media => media.readyState > 0) ||
      document.querySelector('video,audio') ||
      null

    return activeMedia
  }

  function getVisibleActiveMedia () {
    cleanupDetachedMedia()

    const candidates = Array.from(mediaElements)
    const visibleCandidate = candidates.find(media => isMediaVisibleInViewport(media))
    if (visibleCandidate) {
      activeMedia = visibleCandidate
      return visibleCandidate
    }

    if (activeMedia && isMediaVisibleInViewport(activeMedia)) return activeMedia
    return null
  }

  function getShortcutBinding (key) {
    return KEY_BINDINGS.find(binding => binding.keys.includes(key)) || null
  }

  function setTargetPlaybackRate (nextRate, options = {}) {
    nextRate = normalizeRate(nextRate)

    if (options.revision && options.revision !== playbackRateRevision) {
      return false
    }

    if (options.record !== false) {
      playbackRateRevision += 1
      saveTargetPlaybackRate(nextRate)
    }

    if (options.lock !== false) {
      playbackRateLockUntil = Date.now() + (options.lock || 1000)
    }

    scanMediaElements(document)
    cleanupDetachedMedia()
    mediaElements.forEach(media => {
      if (isMediaConnected(media)) writeNativePlaybackRate(media, nextRate)
    })

    if (!options.silent) showFeedback(FEEDBACK_TEXT.speed + targetPlaybackRate)
    if (options.retry !== false) retryPlaybackRateWrite(nextRate, playbackRateRevision)
  }

  function retryPlaybackRateWrite (nextRate, revision) {
    playbackRateRetryTimers.forEach(clearTimeout)
    playbackRateRetryTimers = [
      setTimeout(() => setTargetPlaybackRate(nextRate, {
        silent: true,
        lock: 600,
        retry: false,
        record: false,
        revision
      }), 600),
      setTimeout(() => setTargetPlaybackRate(nextRate, {
        silent: true,
        lock: 600,
        retry: false,
        record: false,
        revision
      }), 1200)
    ]
  }

  function increasePlaybackRate () {
    setTargetPlaybackRate(targetPlaybackRate + PLAYBACK_RATE_STEP)
  }

  function decreasePlaybackRate () {
    setTargetPlaybackRate(targetPlaybackRate - PLAYBACK_RATE_STEP)
  }

  function toggleDefaultPlaybackRate () {
    const oldRate = normalizeRate(targetPlaybackRate)
    const nextRate = oldRate === 1 ? lastTargetPlaybackRate : 1

    if (oldRate !== 1) {
      lastTargetPlaybackRate = oldRate
      writeStoredValue(LAST_PLAYBACK_RATE_STORAGE_KEY, lastTargetPlaybackRate)
    }

    setTargetPlaybackRate(nextRate)
  }

  function setVolume (nextVolume, media = getActiveMedia()) {
    if (!media || isVolumeLocked(media)) return

    nextVolume = Number(Number(nextVolume).toFixed(2))
    if (Number.isNaN(nextVolume)) return
    if (nextVolume < 0) nextVolume = 0

    if (nextVolume > 1) {
      nextVolume = Math.ceil(nextVolume)

      try {
        if (!mediaAmplifiers.has(media)) {
          mediaAmplifiers.set(media, new MediaAmplifier(media))
        }
      } catch (_) {
        nextVolume = 1
      }

      if (nextVolume > MAX_VOLUME) nextVolume = MAX_VOLUME
      const amplifier = mediaAmplifiers.get(media)
      if (!amplifier || !amplifier.setLoudness) nextVolume = 1
    }

    currentVolumeLevel = nextVolume

    const amplifier = mediaAmplifiers.get(media)
    if (nextVolume > 1 && amplifier && amplifier.setLoudness) {
      amplifier.setLoudness(nextVolume)
      media.muted = false
      showFeedback(FEEDBACK_TEXT.volume + parseInt(nextVolume * 100) + '%')
      return
    }

    writeStoredValue(VOLUME_STORAGE_KEY, nextVolume)
    targetNativeVolume = nextVolume
    hasStoredVolumePreference = true
    scanMediaElements(document)
    cleanupDetachedMedia()
    mediaElements.forEach(trackedMedia => {
      const trackedAmplifier = mediaAmplifiers.get(trackedMedia)
      if (trackedAmplifier && trackedAmplifier.setLoudness) {
        trackedAmplifier.setLoudness(1)
      }
      writeNativeVolume(trackedMedia, nextVolume)
    })

    media.muted = false
    showFeedback(FEEDBACK_TEXT.volume + parseInt(media.volume * 100) + '%')
  }

  function increaseVolume (step) {
    const media = getActiveMedia()
    if (!media) return

    volumeLockDeadlines.delete(media)
    step = Math.abs(step) || FAST_VOLUME_STEP
    if (currentVolumeLevel > 1 && mediaAmplifiers.has(media)) {
      setVolume(currentVolumeLevel + step, media)
    } else {
      setVolume(media.volume + step, media)
    }
    lockVolume(media)
  }

  function decreaseVolume (step) {
    const media = getActiveMedia()
    if (!media) return

    volumeLockDeadlines.delete(media)
    step = -Math.abs(step || FAST_VOLUME_STEP)
    if (currentVolumeLevel > 1 && mediaAmplifiers.has(media)) {
      setVolume(Math.floor(currentVolumeLevel + step), media)
    } else {
      setVolume(media.volume + step, media)
    }
    lockVolume(media)
  }

  function updateFeedbackPosition (feedbackEl) {
    const media = getActiveMedia()
    if (!feedbackEl || !media || !media.getBoundingClientRect) return
    const rect = media.getBoundingClientRect()
    feedbackEl.style.left = `${Math.max(0, rect.left)}px`
    feedbackEl.style.top = `${Math.max(0, rect.top)}px`
  }

  function showFeedback (text) {
    let feedbackEl = document.getElementById('__media_controller_feedback__')
    if (!feedbackEl) {
      feedbackEl = document.createElement('div')
      feedbackEl.id = '__media_controller_feedback__'
      feedbackEl.style.cssText = [
        'position:fixed',
        'z-index:999999',
        'left:0',
        'top:0',
        'padding:5px 10px',
        'border-bottom-right-radius:5px',
        'background:rgba(0,0,0,.4)',
        'color:#fff',
        'font:16px/1.35 "microsoft yahei",Verdana,Geneva,sans-serif',
        'pointer-events:none',
        'opacity:0',
        'display:none',
        'transition:opacity 600ms',
        '-webkit-font-smoothing:subpixel-antialiased',
        '-webkit-user-select:none',
        'user-select:none'
      ].join(';')
      document.documentElement.appendChild(feedbackEl)
    }

    feedbackEl.textContent = text
    updateFeedbackPosition(feedbackEl)
    feedbackEl.style.display = 'block'
    feedbackEl.style.opacity = '1'
    clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => {
      feedbackEl.style.opacity = '0'
      setTimeout(() => {
        if (feedbackEl.style.opacity === '0') feedbackEl.style.display = 'none'
      }, 600)
    }, 900)
  }

  function bindFeedbackPositionRefresh () {
    const refreshFeedbackPosition = () => {
      const feedbackEl = document.getElementById('__media_controller_feedback__')
      if (feedbackEl && feedbackEl.style.display === 'block') {
        updateFeedbackPosition(feedbackEl)
      }
    }

    window.addEventListener('scroll', refreshFeedbackPosition, true)
    window.addEventListener('resize', refreshFeedbackPosition, true)
  }

  function installPlaybackRateGuard () {
    if (!playbackRateDescriptor || !playbackRateDescriptor.get || !playbackRateDescriptor.set) return

    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
      configurable: true,
      enumerable: true,
      get: function () {
        return playbackRateDescriptor.get.call(this)
      },
      set: function (value) {
        const nextRate = normalizeRate(value)
        if (!isInternalPlaybackRateWrite && Date.now() < playbackRateLockUntil && Math.abs(nextRate - targetPlaybackRate) > 0.01) {
          return
        }
        return playbackRateDescriptor.set.call(this, value)
      }
    })
  }

  function installVolumeGuard () {
    if (!volumeDescriptor || !volumeDescriptor.get || !volumeDescriptor.set) return

    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      enumerable: true,
      get: function () {
        return volumeDescriptor.get.call(this)
      },
      set: function (value) {
        if (isVolumeLocked(this)) return
        return volumeDescriptor.set.call(this, value)
      }
    })
  }

  function installDefinePropertyGuard () {
    const rawDefineProperty = Object.defineProperty
    const rawDefineProperties = Object.defineProperties

    Object.defineProperty = new Proxy(rawDefineProperty, {
      apply (target, thisArg, args) {
        if (args[1] === 'playbackRate' && isMedia(args[0])) {
          args = args.slice()
          args[1] = '__media_controller_blocked_playbackRate__'
        }
        return Reflect.apply(target, thisArg, args)
      }
    })

    Object.defineProperties = new Proxy(rawDefineProperties, {
      apply (target, thisArg, args) {
        if (isMedia(args[0]) && args[1] && args[1].playbackRate) {
          args = args.slice()
          args[1] = { ...args[1] }
          args[1].__media_controller_blocked_playbackRate__ = args[1].playbackRate
          delete args[1].playbackRate
        }
        return Reflect.apply(target, thisArg, args)
      }
    })
  }

  function installMediaDetectionGuard () {
    ['play', 'pause', 'load', 'addEventListener'].forEach(methodName => {
      const rawMethod = HTMLMediaElement.prototype[methodName]
      if (typeof rawMethod !== 'function') return

      HTMLMediaElement.prototype[methodName] = new Proxy(rawMethod, {
        apply (target, thisArg, args) {
          if (isMedia(thisArg)) registerMediaElement(thisArg)
          return Reflect.apply(target, thisArg, args)
        }
      })
    })
  }

  function installKeybindings () {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.metaKey) return
      if (isEditableTarget(event.target)) return

      const key = String(event.key || '').toLowerCase()
      const binding = getShortcutBinding(key)
      if (!binding) return

      const visibleMedia = getVisibleActiveMedia()
      if (!visibleMedia) return

      if ((key !== 'arrowup' && key !== 'arrowdown') && (event.ctrlKey || event.shiftKey)) return
      if ((key === 'arrowup' || key === 'arrowdown') && event.shiftKey) return

      event.preventDefault()
      event.stopPropagation()
      binding.run(event, key)
    }, true)
  }

  function startObserver () {
    const observer = new MutationObserver(records => {
      let hasRemovedNodes = false
      records.forEach(record => {
        record.addedNodes.forEach(scanMediaElements)
        if (record.removedNodes.length) hasRemovedNodes = true
      })
      if (hasRemovedNodes) cleanupDetachedMedia()
    })

    const start = () => {
      scanMediaElements(document)
      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true
      })
    }

    if (document.documentElement) {
      start()
    } else {
      document.addEventListener('DOMContentLoaded', start, { once: true })
    }
  }

  installPlaybackRateGuard()
  installVolumeGuard()
  installDefinePropertyGuard()
  installMediaDetectionGuard()
  installKeybindings()
  bindFeedbackPositionRefresh()
  startObserver()
})()
