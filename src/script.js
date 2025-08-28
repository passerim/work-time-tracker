/* global bootstrap */

'use strict'

document.addEventListener('DOMContentLoaded', () => {
  // === Constants ===
  const DIRECTIONS = {IN: 'In', OUT: 'Out'}
  const DEFAULT_WORKDAY_HOURS = 7.2 // 7h:12m
  const MAX_WORK_HOURS = 9
  const PROGRESS_BAR_UPDATE_MS = 5 * 60 * 1000
  const STORAGE_KEYS = {
    TIMESTAMPS: 'workTimestamps',
    LANGUAGE: 'selectedLanguage',
    WORKDAY_LENGTH: 'workdayLength',
  }

  // === Language Data ===
  const LANG = {
    en: {
      settingsTitle: 'Settings',
      workdayLengthLabel: 'Workday Length (hh:mm):',
      saveButton: 'Save',
      settingsAria: 'Settings',
      timestampLabel: 'Timestamp (Hour & Minute):',
      directionLabel: 'Direction:',
      addTimestampButton: 'Add Timestamp',
      resetButton: 'Reset',
      myTime: 'My Time',
      timestamps: 'Timestamps',
      date: 'Date',
      time: 'Time',
      direction: 'Direction',
      total: 'Total',
      in: 'In',
      out: 'Out',
      alertTimestamp: 'Please enter a timestamp.',
      alertValidTime: 'Please enter a valid time (HH:MM).',
      alertOrder: 'Next timestamps cannot be before last one.',
      alertAlreadyIn: 'You are already marked as "in". Please mark "out" first.',
      alertNeedIn: 'You need to mark "in" before marking "out".',
      alertStorageError: 'Failed to save data. Storage may be full.',
      settingsSaved: 'Settings saved!',
    },
    it: {
      settingsTitle: 'Impostazioni',
      workdayLengthLabel: 'Durata giornata lavorativa (hh:mm):',
      saveButton: 'Salva',
      settingsAria: 'Impostazioni',
      timestampLabel: 'Orario (Ora e Minuto):',
      directionLabel: 'Direzione:',
      addTimestampButton: 'Aggiungi Timbratura',
      resetButton: 'Resetta',
      myTime: 'Il Mio Tempo',
      timestamps: 'Timbrature',
      date: 'Data',
      time: 'Ora',
      direction: 'Direzione',
      total: 'Totale',
      in: 'Entrata',
      out: 'Uscita',
      alertTimestamp: 'Inserisci un orario.',
      alertValidTime: 'Inserisci un orario valido (HH:MM).',
      alertOrder: "La nuova timbratura non può essere precedente all'ultima.",
      alertAlreadyIn: 'Sei già segnato come "entrata". Segna prima "uscita".',
      alertNeedIn: 'Devi segnare "entrata" prima di "uscita".',
      alertStorageError: 'Impossibile salvare i dati. Lo storage potrebbe essere pieno.',
      settingsSaved: 'Impostazioni salvate!',
    },
  }

  // === DOM Elements ===
  const $ = (id) => document.getElementById(id)
  const elements = {
    form: $('timeForm'),
    timestamp: $('timestamp'),
    direction: $('direction'),
    workbar: $('workProgressBar'),
    toworkbar: $('toWorkProgressBar'),
    addtimestamp: $('addTimestampButton'),
    reset: $('resetButton'),
    elapsed: $('elapsedBadge'),
    reload: $('reloadProgress'),
    table: $('timestampsTable'),
    tooltip: $('tooltip'),
    preloader: $('preloader'),
    container: $('container'),
    langswitch: $('langSwitch'),
    langen: $('lang-en'),
    langit: $('lang-it'),
    savesettings: $('saveSettings'),
    workdaylength: $('workdayLength'),
    settingspanel: $('settingsPanel'),
  }

  // === Toast for Errors ===
  const showToast = (message) => {
    const toastEl = document.createElement('div')
    toastEl.className = 'toast align-items-center text-bg-danger border-0 position-fixed top-0 end-0 m-3'
    toastEl.setAttribute('role', 'alert')
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `
    document.body.appendChild(toastEl)
    const toast = new bootstrap.Toast(toastEl)
    toast.show()
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove())
  }

  // === State ===
  let timestamps = []
  let progressInterval = null
  let tooltipInstance = null
  let currentLang = 'en'
  let workdayLength = DEFAULT_WORKDAY_HOURS

  // === Utility Functions ===
  const formatTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return '--:--'
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  const todayISO = () => new Date().toISOString().split('T')[0]
  const getLastTimestamp = () => timestamps[timestamps.length - 1] || null
  const isNextDay = () => {
    const last = getLastTimestamp()
    return last ? todayISO() !== last.timestamp.split('T')[0] : false
  }
  const isUserWorking = () => {
    const last = getLastTimestamp()
    return last?.direction === DIRECTIONS.IN
  }

  // === Storage Management ===
  const storage = {
    save: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.error(`Failed to save ${key}:`, e)
        showToast(LANG[currentLang].alertStorageError)
      }
    },

    load: (key, defaultValue = null) => {
      try {
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : defaultValue
      } catch (e) {
        console.error(`Failed to load ${key}:`, e)
        showToast(LANG[currentLang].alertStorageError)
        return defaultValue
      }
    },

    remove: (key) => {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e)
        showToast(LANG[currentLang].alertStorageError)
      }
    },
  }

  // === Validation ===
  const validation = {
    isValidTime: (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return !isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
    },

    canAddTimestamp: (newTime, direction) => {
      const last = getLastTimestamp()
      if (last && new Date(last.timestamp).getTime() > newTime.getTime()) {
        return {valid: false, error: 'alertOrder'}
      }
      if (direction === DIRECTIONS.IN && isUserWorking()) {
        return {valid: false, error: 'alertAlreadyIn'}
      }
      if (direction === DIRECTIONS.OUT && (!timestamps.length || last?.direction === DIRECTIONS.OUT)) {
        return {valid: false, error: 'alertNeedIn'}
      }
      return {valid: true}
    },
  }

  // === Language Management ===
  const language = {
    load: () => {
      const stored = storage.load(STORAGE_KEYS.LANGUAGE, 'en')
      currentLang = ['en', 'it'].includes(stored) ? stored : 'en'
    },

    save: () => storage.save(STORAGE_KEYS.LANGUAGE, currentLang),

    toggle: () => {
      currentLang = currentLang === 'en' ? 'it' : 'en'
      language.save()
      language.updateUI()
      displayTimestamps()
    },

    updateUI: () => {
      const lang = LANG[currentLang]
      const setText = (selector, text) => {
        const el = typeof selector === 'string' ? document.querySelector(selector) : selector
        if (el) el.textContent = text
      }

      // Language switcher
      elements.langen?.classList.toggle('selected-lang', currentLang === 'en')
      elements.langen?.classList.toggle('not-selected-lang', currentLang !== 'en')
      elements.langit?.classList.toggle('selected-lang', currentLang === 'it')
      elements.langit?.classList.toggle('not-selected-lang', currentLang !== 'it')

      // UI Elements
      setText('#settingsPanel .card-title', lang.settingsTitle)
      setText('label[for="workdayLength"]', lang.workdayLengthLabel)
      setText(elements.savesettings, lang.saveButton)
      setText('label[for="timestamp"]', lang.timestampLabel)
      setText('label[for="direction"]', lang.directionLabel)
      setText(elements.addtimestamp, lang.addTimestampButton)
      setText(elements.reset, lang.resetButton)
      setText($('timeLabel'), lang.myTime)
      setText($('timestampsLabel'), lang.timestamps)

      // Table headers
      const ths = elements.table?.querySelectorAll('thead tr th')
      if (ths?.length >= 3) {
        setText(ths[0], lang.date)
        setText(ths[1], lang.time)
        setText(ths[2], lang.direction)
      }

      // Direction options
      if (elements.direction?.options.length >= 2) {
        setText(elements.direction.options[0], lang.in)
        setText(elements.direction.options[1], lang.out)
      }

      // Update total badge
      const currentText = elements.elapsed?.textContent || ''
      if (currentText.includes(':')) {
        const timeText = currentText.split(': ').slice(1).join(': ')
        elements.elapsed.textContent = `${lang.total}: ${timeText}`
      }

      document.documentElement.setAttribute('lang', currentLang)
    },
  }

  // === Progress Bar Management ===
  const progressBar = {
    start: () => {
      progressBar.update()
      if (!progressInterval) {
        progressInterval = setInterval(progressBar.update, PROGRESS_BAR_UPDATE_MS)
        elements.workbar?.classList.add('active')
      }
    },

    stop: () => {
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      elements.workbar?.classList.remove('active')
    },

    update: () => {
      const {totalWorkSec, progressPct, timeToWork, stopTime} = progressBar.calculate()

      // Update main progress bar
      if (elements.workbar) {
        elements.workbar.style.width = `${progressPct}%`
        elements.workbar.setAttribute('aria-valuenow', progressPct)
      }

      // Update elapsed time badge
      const hours = Math.floor(totalWorkSec / 3600)
      const minutes = Math.floor((totalWorkSec % 3600) / 60)
      if (elements.elapsed) {
        elements.elapsed.textContent = `${LANG[currentLang].total}: ${hours}h ${minutes}m`
      }

      // Update remaining work bar and tooltip
      if (isUserWorking()) {
        const toWorkPct = Math.round(Math.min(100, (timeToWork / (MAX_WORK_HOURS * 3600)) * 100))
        if (elements.toworkbar) {
          elements.toworkbar.style.width = `${toWorkPct}%`
          elements.toworkbar.setAttribute('aria-valuenow', toWorkPct)
        }
        tooltip.update(stopTime)
      } else {
        if (elements.toworkbar) {
          elements.toworkbar.style.width = '0'
          elements.toworkbar.setAttribute('aria-valuenow', 0)
        }
        tooltip.update('')
      }
    },

    calculate: () => {
      let totalWorkSec = 0

      // Calculate completed work periods
      for (let i = 0; i < timestamps.length - 1; i += 2) {
        const start = new Date(timestamps[i].timestamp).getTime()
        const end = new Date(timestamps[i + 1].timestamp).getTime()
        if (!isNaN(start) && !isNaN(end)) {
          totalWorkSec += (end - start) / 1000
        }
      }

      // Add current work period if working
      if (timestamps.length % 2 !== 0) {
        const last = getLastTimestamp()
        if (last) {
          const start = new Date(last.timestamp).getTime()
          if (!isNaN(start)) {
            totalWorkSec += (Date.now() - start) / 1000
          }
        }
      }

      const progressPct = Math.round(Math.min(100, (totalWorkSec / (MAX_WORK_HOURS * 3600)) * 100))
      const timeToWork = Math.max(0, workdayLength * 3600 - totalWorkSec)
      const stopTime = formatTime(new Date(Date.now() + timeToWork * 1000))

      return {totalWorkSec, progressPct, timeToWork, stopTime}
    },

    reset: () => {
      progressBar.stop()
      if (elements.workbar) {
        elements.workbar.style.width = '0%'
        elements.workbar.setAttribute('aria-valuenow', 0)
      }
      if (elements.toworkbar) {
        elements.toworkbar.style.width = '0%'
        elements.toworkbar.setAttribute('aria-valuenow', 0)
      }
      if (elements.elapsed) {
        elements.elapsed.textContent = `${LANG[currentLang].total}: 0h 0m`
      }
      tooltip.update('')
    },
  }

  // === Tooltip Management ===
  const tooltip = {
    update: (value) => {
      const animations = [
        ...(elements.workbar?.getAnimations?.() || []),
        ...(elements.toworkbar?.getAnimations?.() || []),
      ]

      if (animations.length > 0) {
        Promise.all(animations.map((a) => a.finished))
          .then(() => tooltip.show(value))
          .catch((err) => {
            if (err?.name !== 'AbortError') console.error('Tooltip animation error:', err)
          })
      } else {
        tooltip.show(value)
      }
    },

    show: (value) => {
      if (tooltipInstance) {
        tooltipInstance.dispose()
        tooltipInstance = null
      }

      if (value && value.trim()) {
        elements.tooltip?.setAttribute('data-bs-title', value)
        tooltipInstance = new bootstrap.Tooltip(elements.tooltip)
        if (isUserWorking()) tooltipInstance.show()
      } else {
        elements.tooltip?.removeAttribute('data-bs-title')
      }
    },
  }

  // === Table Management ===
  const displayTimestamps = () => {
    const tbody = elements.table?.querySelector('tbody')
    if (!tbody) return

    tbody.innerHTML = ''
    timestamps.forEach((entry, idx) => {
      const row = tbody.insertRow()

      // Add date cell only for first row
      if (idx === 0) {
        const dateCell = row.insertCell()
        dateCell.rowSpan = timestamps.length
        dateCell.textContent = new Date(entry.timestamp).toLocaleDateString()
      }

      // Add time and direction cells
      const timeCell = row.insertCell()
      const dirCell = row.insertCell()
      timeCell.textContent = formatTime(new Date(entry.timestamp))
      dirCell.textContent = entry.direction === DIRECTIONS.IN ? LANG[currentLang].in : LANG[currentLang].out
    })

    // Set next expected direction
    const nextDirection =
      timestamps.length > 0 && getLastTimestamp()?.direction === DIRECTIONS.IN ? DIRECTIONS.OUT : DIRECTIONS.IN
    if (elements.direction) elements.direction.value = nextDirection
  }

  // === Form Management ===
  const form = {
    submit: (event) => {
      event.preventDefault()

      const timestampValue = elements.timestamp?.value
      const directionValue = elements.direction?.value

      if (!timestampValue) {
        showToast(LANG[currentLang].alertTimestamp)
        return
      }

      if (!validation.isValidTime(timestampValue)) {
        showToast(LANG[currentLang].alertValidTime)
        return
      }

      const now = new Date()
      const [hours, minutes] = timestampValue.split(':').map(Number)
      const newTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)

      const validationResult = validation.canAddTimestamp(newTimestamp, directionValue)
      if (!validationResult.valid) {
        showToast(LANG[currentLang][validationResult.error])
        return
      }

      // Add timestamp
      timestamps.push({
        timestamp: newTimestamp.toISOString(),
        direction: directionValue,
      })

      storage.save(STORAGE_KEYS.TIMESTAMPS, timestamps)
      displayTimestamps()
      progressBar.update()

      // Manage progress bar state
      if (directionValue === DIRECTIONS.IN) {
        progressBar.start()
      } else {
        progressBar.stop()
      }

      // Clear form
      if (elements.timestamp) elements.timestamp.value = ''
    },

    reset: () => {
      timestamps = []
      storage.remove(STORAGE_KEYS.TIMESTAMPS)
      displayTimestamps()
      progressBar.reset()
    },
  }

  // === Settings Management ===
  const settings = {
    load: () => {
      const stored = storage.load(STORAGE_KEYS.WORKDAY_LENGTH, DEFAULT_WORKDAY_HOURS)
      workdayLength = !isNaN(Number(stored)) ? Number(stored) : DEFAULT_WORKDAY_HOURS
    },

    save: (hours) => storage.save(STORAGE_KEYS.WORKDAY_LENGTH, hours),

    updateInput: () => {
      if (elements.workdaylength) {
        const hours = Math.floor(workdayLength)
        const minutes = Math.floor((workdayLength - hours) * 60)
        elements.workdaylength.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }
    },

    handleChange: () => {
      const value = elements.workdaylength?.value
      if (value && validation.isValidTime(value)) {
        const [h, m] = value.split(':').map(Number)
        workdayLength = h + m / 60
        settings.save(workdayLength)
        progressBar.update()
        showToast(LANG[currentLang].settingsSaved)
      }
    },

    handleSave: () => {
      settings.handleChange() // Reuse logic
    },
  }

  // === Event Handlers ===
  const events = {
    timestampDoubleClick: () => {
      if (elements.timestamp) elements.timestamp.value = formatTime(new Date())
    },

    reloadProgress: () => {
      if (tooltipInstance) tooltipInstance.hide()
      if (elements.workbar) {
        elements.workbar.style.width = '0%'
        elements.workbar.setAttribute('aria-valuenow', 0)
      }
      if (elements.toworkbar) {
        elements.toworkbar.style.width = '0%'
        elements.toworkbar.setAttribute('aria-valuenow', 0)
      }
      setTimeout(progressBar.update, 200)
    },

    settingsToggle: () => {
      if (tooltipInstance?.update) tooltipInstance.update()
    },
  }

  // === UI Control ===
  const ui = {
    hidePreloader: () => {
      if (elements.preloader) {
        elements.preloader.classList.remove('d-flex')
        elements.preloader.style.display = 'none'
      }
    },

    showContainer: () => {
      if (elements.container) elements.container.style.display = 'block'
    },
  }

  // === Initialization ===
  const init = () => {
    // Load stored data
    language.load()
    settings.load()
    timestamps = storage.load(STORAGE_KEYS.TIMESTAMPS, [])

    // Update UI
    language.updateUI()
    settings.updateInput()

    // Show app after delay
    setTimeout(() => {
      ui.hidePreloader()
      ui.showContainer()

      if (timestamps.length > 0) {
        // Reset if new day (always, to avoid multi-day issues)
        if (isNextDay()) {
          form.reset()
        } else {
          if (isUserWorking()) progressBar.start()
          displayTimestamps()
        }
      }
    }, 800)
  }

  // === Event Listeners ===
  elements.form?.addEventListener('submit', form.submit)
  elements.reset?.addEventListener('click', form.reset)
  elements.timestamp?.addEventListener('dblclick', events.timestampDoubleClick)
  elements.reload?.addEventListener('click', events.reloadProgress)
  elements.langswitch?.addEventListener('click', language.toggle)
  elements.workdaylength?.addEventListener('change', settings.handleChange)
  elements.settingspanel?.addEventListener('shown.bs.collapse', events.settingsToggle)
  elements.settingspanel?.addEventListener('hidden.bs.collapse', events.settingsToggle)
  elements.savesettings?.addEventListener('click', settings.handleSave)

  // === Start Application ===
  init()
})
