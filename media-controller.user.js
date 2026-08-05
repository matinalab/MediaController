// ==UserScript==
// @name         MediaController
// @namespace    https://github.com/matinalab/MediaController
// @version      0.3.0
// @description  Media playback speed and volume controller.
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
  const mediaElements = new Set()
  const mediaAmplifiers = new WeakMap()
  const presetPlaybackRateState = new Map()

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
  let currentVolumeLevel = normalizeVolume(readStoredValue(
    VOLUME_STORAGE_KEY,
    LEGACY_STORAGE_KEYS.volume,
    1
  ))
  let activeMedia = null
  let playbackRateLockUntil = 0
  const volumeLockDeadlines = new WeakMap()
  let isInternalPlaybackRateWrite = false
  let feedbackTimer = 0
  let playbackRateRevision = 0

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

  function isEditableTarget (target) {
    if (!target) return false
    const tag = String(target.tagName || '').toLowerCase()
    return target.isContentEditable || ['input', 'textarea', 'select'].includes(tag)
  }

  function isMedia (node) {
    return node instanceof HTMLMediaElement
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
      if (document.contains(media)) return

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
    if (activeMedia && document.contains(activeMedia)) return activeMedia

    const candidates = Array.from(mediaElements)
    activeMedia = candidates.find(media => !media.paused) ||
      candidates.find(media => media.readyState > 0) ||
      document.querySelector('video,audio') ||
      null

    return activeMedia
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
      if (document.contains(media)) writeNativePlaybackRate(media, nextRate)
    })

    if (!options.silent) showFeedback(FEEDBACK_TEXT.speed + targetPlaybackRate)
    if (options.retry !== false) retryPlaybackRateWrite(nextRate, playbackRateRevision)
  }

  function retryPlaybackRateWrite (nextRate, revision) {
    setTimeout(() => setTargetPlaybackRate(nextRate, {
      silent: true,
      lock: 600,
      retry: false,
      record: false,
      revision
    }), 600)
    setTimeout(() => setTargetPlaybackRate(nextRate, {
      silent: true,
      lock: 600,
      retry: false,
      record: false,
      revision
    }), 1200)
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

  function setPresetPlaybackRate (presetRate) {
    presetRate = Number(presetRate)
    if (!presetRate || Number.isNaN(presetRate)) return

    const info = presetPlaybackRateState.get(presetRate) || {
      time: Date.now() - 1000,
      value: presetRate
    }
    if (Date.now() - info.time < 300) {
      info.value += presetRate
    } else {
      info.value = presetRate
    }
    info.time = Date.now()
    presetPlaybackRateState.set(presetRate, info)

    setTargetPlaybackRate(info.value)
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
        if (isMedia(args[0]) && args[1] === 'playbackRate') {
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

  function installKeybindings () {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.metaKey) return
      if (isEditableTarget(event.target)) return

      const key = String(event.key || '').toLowerCase()
      if (key === 'c') {
        if (event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        increasePlaybackRate()
      } else if (key === 'x') {
        if (event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        decreasePlaybackRate()
      } else if (key === 'z') {
        if (event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        toggleDefaultPlaybackRate()
      } else if (/^[1-4]$/.test(key)) {
        if (event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        setPresetPlaybackRate(Number(key))
      } else if (key === 'arrowup') {
        if (event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        increaseVolume(event.ctrlKey ? FAST_VOLUME_STEP : VOLUME_STEP)
      } else if (key === 'arrowdown') {
        if (event.shiftKey) return
        event.preventDefault()
        event.stopPropagation()
        decreaseVolume(event.ctrlKey ? FAST_VOLUME_STEP : VOLUME_STEP)
      }
    }, true)
  }

  function startObserver () {
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(scanMediaElements)
      })
      cleanupDetachedMedia()
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
  installKeybindings()
  bindFeedbackPositionRefresh()
  startObserver()
})()
