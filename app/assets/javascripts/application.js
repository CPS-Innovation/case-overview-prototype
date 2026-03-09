//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  var $header = document.querySelector('[data-module="app-header"]')
  if ($header) {
    new App.Header({ module: $header }).init()
  }
})

