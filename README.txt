GUÍA RÁPIDA

1. RESULTADOS: reemplazar data/championship.json.
2. PRÓXIMA CARRERA Y LINKS: editar data/site.json.
3. REVISTA: subir dentro de magazine/ el siguiente número, por ejemplo mag_pag_3.png, luego mag_pag_4.jpg, etc. Sin dejar números vacíos.
4. EQUIPO NUEVO: agregar su imagen en img/ y su entrada en data/site.json.
5. CUPOS DISPONIBLES: editar data/site.json > registration > availableSlots.
6. FONDOS DE LA PORTADA Y YOUTUBE: editar data/site.json > media > carousel. No se muestran como galería.

La inscripción se administra desde:

data/site.json > registration > paymentUrl
data/site.json > registration > whatsappNumber
data/site.json > registration > whatsappMessage
data/site.json > registration > availableSlots

El QR actual está en img/payment/mercado-pago-qr.png y lleva a https://mpago.la/1AcqJZA.
Si cambia paymentUrl, reemplazar ese PNG o borrar paymentQrAsset para usar el QR automático.
El enlace de la comunidad privada se envía manualmente después de validar el pago y no se publica en la web.

En GitHub Pages no hace falta editar el HTML para las actualizaciones habituales.
Para actualizar también el respaldo de la copia descargable: node scripts/build-data-snapshot.mjs
