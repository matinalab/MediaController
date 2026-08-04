// ==UserScript==
// @name         Media Speed Controller
// @namespace    https://github.com/matinalab/MediaSpeedController
// @version      0.2.2
// @description  Media playback speed controller.
// @match        *://*/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231f2937'/%3E%3Cpath d='M18 44V20l22 12-22 12Z' fill='%23fff'/%3E%3Cpath d='M43 18h5v28h-5z' fill='%2393c5fd'/%3E%3C/svg%3E
// @license      MIT
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict'

  const STORAGE_KEY = '_media_speed_controller_playback_rate_'
  const LAST_STORAGE_KEY = '_media_speed_controller_last_playback_rate_'
  const MIN_RATE = 0.1
  const MAX_RATE = 16
  const STEP = 0.1
  const controlledMediaSet = new Set()
  const presetRateState = new Map()

  let targetRate = normalizeRate(localStorage.getItem(STORAGE_KEY) || 1)
  let lastTargetRate = normalizeRate(localStorage.getItem(LAST_STORAGE_KEY) || 1.5)
  let activeMedia = null
  let rateLockUntil = 0
  let isInternalRateWrite = false
  let feedbackTimer = 0
  let targetRateRevision = 0

  const playbackRateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'playbackRate'
  )

  function normalizeRate (value) {
    value = Number(value)
    if (Number.isNaN(value)) value = 1
    value = Math.min(MAX_RATE, Math.max(MIN_RATE, value))
    return Number(value.toFixed(1))
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
      isInternalRateWrite = true
      playbackRateDescriptor.set.call(media, nextRate)
    } catch (_) {
      try {
        media.playbackRate = nextRate
      } catch (_) {}
    } finally {
      isInternalRateWrite = false
    }
  }

  function saveTargetRate (nextRate) {
    targetRate = normalizeRate(nextRate)
    localStorage.setItem(STORAGE_KEY, String(targetRate))
  }

  function registerMediaElement (media) {
    if (!isMedia(media) || controlledMediaSet.has(media)) return
    controlledMediaSet.add(media)

    media.addEventListener('play', () => {
      activeMedia = media
      setTargetPlaybackRate(targetRate, { silent: true, lock: 400, retry: false, record: false })
    }, true)

    media.addEventListener('mouseenter', () => {
      activeMedia = media
    }, true)

    media.addEventListener('ratechange', () => {
      if (isInternalRateWrite) return
      if (Date.now() < rateLockUntil && Math.abs(media.playbackRate - targetRate) > 0.01) {
        setTargetPlaybackRate(targetRate, { silent: true, lock: 600, retry: false, record: false })
      }
    }, true)

    writeNativePlaybackRate(media, targetRate)
  }

  function scanMediaElements (root) {
    if (!root) return
    if (isMedia(root)) registerMediaElement(root)
    if (root.querySelectorAll) {
      root.querySelectorAll('video,audio').forEach(registerMediaElement)
    }
  }

  function getActiveMedia () {
    if (activeMedia && document.contains(activeMedia)) return activeMedia

    const candidates = Array.from(controlledMediaSet).filter(media => document.contains(media))
    activeMedia = candidates.find(media => !media.paused) ||
      candidates.find(media => media.readyState > 0) ||
      document.querySelector('video,audio') ||
      null

    return activeMedia
  }

  function setTargetPlaybackRate (nextRate, options = {}) {
    nextRate = normalizeRate(nextRate)

    if (options.revision && options.revision !== targetRateRevision) {
      return false
    }

    if (options.record !== false) {
      targetRateRevision += 1
      saveTargetRate(nextRate)
    }

    if (options.lock !== false) {
      rateLockUntil = Date.now() + (options.lock || 1000)
    }

    scanMediaElements(document)
    controlledMediaSet.forEach(media => {
      if (document.contains(media)) writeNativePlaybackRate(media, nextRate)
    })

    const media = getActiveMedia()
    if (media) writeNativePlaybackRate(media, nextRate)

    if (!options.silent) showFeedback(`Speed: ${targetRate}x`)
    if (options.retry !== false) retryPlaybackRateWrite(nextRate, targetRateRevision)
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
    setTargetPlaybackRate(targetRate + STEP)
  }

  function decreasePlaybackRate () {
    setTargetPlaybackRate(targetRate - STEP)
  }

  function toggleDefaultPlaybackRate () {
    const oldRate = normalizeRate(targetRate)
    const nextRate = oldRate === 1 ? lastTargetRate : 1

    if (oldRate !== 1) {
      lastTargetRate = oldRate
      localStorage.setItem(LAST_STORAGE_KEY, String(lastTargetRate))
    }

    setTargetPlaybackRate(nextRate)
  }

  function setPresetPlaybackRate (num) {
    num = Number(num)
    if (!num || Number.isNaN(num)) return

    const info = presetRateState.get(num) || { time: Date.now() - 1000, value: num }
    if (Date.now() - info.time < 300) {
      info.value += num
    } else {
      info.value = num
    }
    info.time = Date.now()
    presetRateState.set(num, info)

    setTargetPlaybackRate(info.value)
  }

  function updateFeedbackPosition (feedbackEl) {
    const media = getActiveMedia()
    if (!feedbackEl || !media || !media.getBoundingClientRect) return
    const rect = media.getBoundingClientRect()
    feedbackEl.style.left = `${Math.max(0, rect.left)}px`
    feedbackEl.style.top = `${Math.max(0, rect.top)}px`
  }

  function showFeedback (text) {
    let feedbackEl = document.getElementById('__media_speed_controller_feedback__')
    if (!feedbackEl) {
      feedbackEl = document.createElement('div')
      feedbackEl.id = '__media_speed_controller_feedback__'
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
    const follow = () => {
      const feedbackEl = document.getElementById('__media_speed_controller_feedback__')
      if (feedbackEl && feedbackEl.style.display === 'block') {
        updateFeedbackPosition(feedbackEl)
      }
    }

    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow, true)
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
        if (!isInternalRateWrite && Date.now() < rateLockUntil && Math.abs(nextRate - targetRate) > 0.01) {
          return
        }
        return playbackRateDescriptor.set.call(this, value)
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
          args[1] = '__media_speed_controller_blocked_playbackRate__'
        }
        return Reflect.apply(target, thisArg, args)
      }
    })

    Object.defineProperties = new Proxy(rawDefineProperties, {
      apply (target, thisArg, args) {
        if (isMedia(args[0]) && args[1] && args[1].playbackRate) {
          args = args.slice()
          args[1] = { ...args[1] }
          args[1].__media_speed_controller_blocked_playbackRate__ = args[1].playbackRate
          delete args[1].playbackRate
        }
        return Reflect.apply(target, thisArg, args)
      }
    })
  }

  function installKeybindings () {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
      if (isEditableTarget(event.target)) return

      const key = String(event.key || '').toLowerCase()
      if (key === 'c') {
        event.preventDefault()
        increasePlaybackRate()
      } else if (key === 'x') {
        event.preventDefault()
        decreasePlaybackRate()
      } else if (key === 'z') {
        event.preventDefault()
        toggleDefaultPlaybackRate()
      } else if (/^[1-4]$/.test(key)) {
        event.preventDefault()
        setPresetPlaybackRate(Number(key))
      }
    }, true)
  }

  function startObserver () {
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(scanMediaElements)
      })
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
  installDefinePropertyGuard()
  installKeybindings()
  bindFeedbackPositionRefresh()
  startObserver()
})()
