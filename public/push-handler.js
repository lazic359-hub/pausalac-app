/* eslint-disable no-undef */
self.addEventListener('push', function (event) {
  var data = { title: 'Paušalac', body: '', url: '/dashboard' }
  if (event.data) {
    try {
      var parsed = event.data.json()
      if (parsed && typeof parsed === 'object') {
        data.title = parsed.title || data.title
        data.body = parsed.body || data.body
        data.url = parsed.url || data.url
      }
    } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i]
        if (c.url && 'focus' in c) return c.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
