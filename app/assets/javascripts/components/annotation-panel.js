;(function () {
  'use strict'

  var documentContent = document.getElementById('document-content')
  var popup = document.querySelector('.js-annotation-popup')
  var annotateBtn = document.querySelector('.js-annotate-btn')
  var newAnnotationCard = document.querySelector('.js-new-annotation-card')
  var sidebarInner = document.querySelector('.js-sidebar-inner')
  var sidebarEmpty = document.querySelector('.js-sidebar-empty')
  var annotationForm = document.getElementById('annotation-form')
  var selectedTextInput = document.getElementById('annotation-selected-text')
  var typeHiddenInput = document.getElementById('annotation-type-hidden')
  var noteHiddenInput = document.getElementById('annotation-note-hidden')
  var typeRadios = document.querySelectorAll('.js-type-radio')
  var noteInput = document.getElementById('annotation-note-input')
  var saveBtn = document.querySelector('.js-save-annotation')
  var cancelBtn = document.querySelector('.js-cancel-annotation')

  var currentRange = null
  var selectionMark = null

  if (!documentContent || !popup) return

  // ── Sticky toolbar border ─────────────────────────────────────────────────

  var sentinel = document.querySelector('.js-toolbar-sentinel')
  var toolbar = document.querySelector('.js-toolbar')

  if (sentinel && toolbar && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      toolbar.classList.toggle('is-stuck', !entries[0].isIntersecting)
    }).observe(sentinel)
  }

  function positionNewCard() {
    // Cards flow naturally — no absolute positioning needed
  }

  // ── Text selection → popup ─────────────────────────────────────────────────

  function clearSelectionHighlight() {
    if (selectionMark) {
      var parent = selectionMark.parentNode
      while (selectionMark.firstChild) {
        parent.insertBefore(selectionMark.firstChild, selectionMark)
      }
      parent.removeChild(selectionMark)
      selectionMark = null
    }
  }

  function hidePopup() {
    popup.hidden = true
    popup.setAttribute('aria-hidden', 'true')
  }

  function showPopup(x, y) {
    popup.hidden = false
    popup.removeAttribute('aria-hidden')
    popup.style.left = x + 'px'
    popup.style.top = (y - popup.offsetHeight - 8) + 'px'
  }

  function hideNewCard() {
    if (newAnnotationCard) {
      newAnnotationCard.hidden = true
    }
    clearSelectionHighlight()
    if (selectedTextInput) selectedTextInput.value = ''
    if (noteInput) noteInput.value = ''
    typeRadios.forEach(function (r) { r.checked = false })
    currentRange = null
  }

  documentContent.addEventListener('mouseup', function () {
    setTimeout(function () {
      var selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        hidePopup()
        return
      }
      var selectedText = selection.toString().trim()
      if (!selectedText || selectedText.length < 3) {
        hidePopup()
        return
      }
      var range = selection.getRangeAt(0)
      if (!documentContent.contains(range.commonAncestorContainer)) {
        hidePopup()
        return
      }

      currentRange = range.cloneRange()
      var rect = range.getBoundingClientRect()
      showPopup(rect.left + rect.width / 2 - (popup.offsetWidth / 2 || 60), rect.top)
    }, 10)
  })

  // ── Annotate button → sidebar form ────────────────────────────────────────

  if (annotateBtn) {
    annotateBtn.addEventListener('click', function () {
      if (!currentRange) return

      var selectedText = currentRange.toString().trim()
      if (selectedTextInput) selectedTextInput.value = selectedText

      // Wrap selected text in a temporary highlight span
      clearSelectionHighlight()
      try {
        selectionMark = document.createElement('span')
        selectionMark.className = 'app-annotation-selecting'
        currentRange.surroundContents(selectionMark)
      } catch (e) {
        // surroundContents fails on partial node selections — just store the text
        selectionMark = null
      }

      window.getSelection().removeAllRanges()
      hidePopup()

      // Position and show the new annotation card in sidebar
      var rect = currentRange.getBoundingClientRect()
      var targetY = rect.top + rect.height / 2
      positionNewCard(targetY)

      if (newAnnotationCard) {
        newAnnotationCard.hidden = false
        if (sidebarEmpty) sidebarEmpty.hidden = true
        if (noteInput) noteInput.focus()
      }
    })
  }

  // ── Save annotation ───────────────────────────────────────────────────────

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var note = noteInput ? noteInput.value.trim() : ''
      var type = ''
      typeRadios.forEach(function (r) { if (r.checked) type = r.value })

      if (!note || !type) {
        if (!type) alert('Please select a type.')
        else if (!note) noteInput.focus()
        return
      }

      if (typeHiddenInput) typeHiddenInput.value = type
      if (noteHiddenInput) noteHiddenInput.value = note

      if (annotationForm) annotationForm.submit()
    })
  }

  // ── Cancel annotation ─────────────────────────────────────────────────────

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      hideNewCard()
      if (sidebarEmpty && !document.querySelectorAll('.js-annotation-card').length) {
        sidebarEmpty.hidden = false
      }
    })
  }

  // ── Close popup when clicking outside ────────────────────────────────────

  document.addEventListener('mousedown', function (e) {
    if (!popup.hidden && !popup.contains(e.target) && !documentContent.contains(e.target)) {
      hidePopup()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!popup.hidden) hidePopup()
      if (newAnnotationCard && !newAnnotationCard.hidden) hideNewCard()
    }
  })

  // ── Card expand/collapse ──────────────────────────────────────────────────

  function activateMark(annotationId) {
    document.querySelectorAll('.app-annotation').forEach(function (m) {
      m.classList.remove('app-annotation--active')
    })
    if (annotationId) {
      var mark = document.querySelector('.app-annotation[data-annotation-id="' + annotationId + '"]')
      if (mark) mark.classList.add('app-annotation--active')
    }
  }

  document.querySelectorAll('.js-card-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var card = toggle.closest('.js-annotation-card')
      var expanded = card.querySelector('.js-card-expanded')
      var isExpanded = toggle.getAttribute('aria-expanded') === 'true'

      toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true')
      if (expanded) expanded.hidden = isExpanded

      var annotationId = isExpanded ? null : card.getAttribute('data-annotation-id')
      activateMark(annotationId)
    })
  })

  // ── Inline edit toggle ────────────────────────────────────────────────────

  document.querySelectorAll('.js-edit-annotation').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.js-annotation-card')
      var viewMode = card.querySelector('.js-view-mode')
      var editMode = card.querySelector('.js-edit-mode')
      if (viewMode) viewMode.hidden = true
      if (editMode) {
        editMode.hidden = false
        var textarea = editMode.querySelector('textarea')
        if (textarea) textarea.focus()
      }
    })
  })

  document.querySelectorAll('.js-cancel-edit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.js-annotation-card')
      var viewMode = card.querySelector('.js-view-mode')
      var editMode = card.querySelector('.js-edit-mode')
      if (editMode) editMode.hidden = true
      if (viewMode) viewMode.hidden = false
    })
  })

})()
