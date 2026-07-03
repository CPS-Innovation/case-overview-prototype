App.VideoAnnotationPanel = function(params) {
  this.container = params.container

  this.video              = $('#document-video')
  this.typeBtns           = $('.js-video-annotate-btn')
  this.newAnnotationCards = $('.js-new-annotation-card')
  this.activeAnnotationCard = null
  this.sidebarInner         = $('.js-sidebar-inner')
  this.sidebarEmpty         = $('.js-sidebar-empty')
  this.annotationForm       = $('#annotation-form')
  this.typeHiddenInput      = $('#annotation-type-hidden')
  this.noteHiddenInput      = $('#annotation-note-hidden')
  this.timestampHiddenInput = $('#annotation-timestamp-hidden')
  this.saveBtn              = $('.js-save-annotation')
  this.cancelBtn            = $('.js-cancel-annotation')

  this.caseId     = this.container.data('case-id')
  this.documentId = this.container.data('document-id')

  this.pendingAnnotationType = null
  this.pendingTimestamp      = null

  this.setupEvents()
}

App.VideoAnnotationPanel.prototype.setupEvents = function() {
  this.typeBtns.on('click', $.proxy(this, 'onTypeBtnClick'))
  this.saveBtn.on('click', $.proxy(this, 'onSaveClick'))
  this.cancelBtn.on('click', $.proxy(this, 'onCancelClick'))
  this.sidebarInner.on('click', '.js-annotation-card', $.proxy(this, 'onCardClick'))
}

// Pausing captures the moment the user wants to annotate, and gives them a
// still frame to refer to while writing the note.
App.VideoAnnotationPanel.prototype.onTypeBtnClick = function(e) {
  var video = this.video[0]
  video.pause()

  this.pendingAnnotationType = $(e.currentTarget).data('type')
  this.pendingTimestamp = video.currentTime

  this.newAnnotationCards.prop('hidden', true)
  this.activeAnnotationCard = this.newAnnotationCards.filter('.js-new-annotation-card--' + this.pendingAnnotationType)
  this.activeAnnotationCard.prop('hidden', false)
  this.sidebarEmpty.prop('hidden', true)

  if (this.pendingAnnotationType === 'evidence') {
    this.activeAnnotationCard.find('input[name="pointsToProveCheckbox"]').first().focus()
  } else {
    this.activeAnnotationCard.find('.js-annotation-note-input').focus()
  }
}

App.VideoAnnotationPanel.prototype.hideNewCard = function() {
  this.newAnnotationCards.prop('hidden', true)
  this.newAnnotationCards.find('.js-annotation-note-input').val('')
  this.newAnnotationCards.find('.js-annotation-ptp-reasoning').val('')
  this.newAnnotationCards.find('input[name="pointsToProveCheckbox"]:checked')
    .prop('checked', false)
    .trigger('change')
  this.annotationForm.find('.js-annotation-ptp-hidden').remove()
  this.activeAnnotationCard = null
  this.pendingAnnotationType = null
  this.pendingTimestamp = null
}

App.VideoAnnotationPanel.prototype.onSaveClick = function() {
  if (!this.pendingAnnotationType) return
  if (this.pendingAnnotationType === 'evidence') {
    this.onSaveEvidenceClick()
    return
  }
  var noteInput = this.activeAnnotationCard.find('.js-annotation-note-input')
  var note = noteInput.val().trim()
  if (!note) { noteInput.focus(); return }
  this.typeHiddenInput.val(this.pendingAnnotationType)
  this.noteHiddenInput.val(note)
  this.timestampHiddenInput.val(this.pendingTimestamp)
  this.annotationForm[0].submit()
}

// Evidence annotations link one or more points to prove, each with its own
// reasoning (revealed under its checkbox), rather than a single shared note.
App.VideoAnnotationPanel.prototype.onSaveEvidenceClick = function() {
  var self = this
  var checked = this.activeAnnotationCard.find('input[name="pointsToProveCheckbox"]:checked')

  if (!checked.length) {
    this.activeAnnotationCard.find('input[name="pointsToProveCheckbox"]').first().focus()
    return
  }

  var fields = []
  var firstInvalid = null

  checked.each(function() {
    var pointId = $(this).val()
    var textarea = self.activeAnnotationCard.find('.js-annotation-ptp-reasoning[data-point-to-prove-id="' + pointId + '"]')
    var reasoning = textarea.val().trim()
    if (!reasoning) {
      if (!firstInvalid) firstInvalid = textarea
      return
    }
    fields.push({ pointId: pointId, reasoning: reasoning })
  })

  if (firstInvalid) { firstInvalid.focus(); return }

  this.annotationForm.find('.js-annotation-ptp-hidden').remove()
  fields.forEach(function(field) {
    $('<input>', {
      type: 'hidden',
      class: 'js-annotation-ptp-hidden',
      name: 'pointsToProve[' + field.pointId + ']',
      value: field.reasoning
    }).appendTo(self.annotationForm)
  })

  this.typeHiddenInput.val('evidence')
  this.noteHiddenInput.val('')
  this.timestampHiddenInput.val(this.pendingTimestamp)
  this.annotationForm[0].submit()
}

App.VideoAnnotationPanel.prototype.onCancelClick = function(e) {
  e.preventDefault()
  this.hideNewCard()
  if (!$('.js-annotation-card').length) {
    this.sidebarEmpty.prop('hidden', false)
  }
}

App.VideoAnnotationPanel.prototype.onCardClick = function(e) {
  if ($(e.target).closest('a').length) return
  var card = $(e.currentTarget)
  var timestampSeconds = card.data('timestamp-seconds')

  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active')
  card.addClass('is-selected app-annotation-card--active')

  if (timestampSeconds !== undefined && this.video[0]) {
    this.video[0].currentTime = timestampSeconds
  }
}
