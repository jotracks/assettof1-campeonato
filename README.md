# Assetto F1 — Campeonato 2026

Sitio estático preparado para GitHub Pages. No necesita servidor, base de datos ni proceso de compilación.

## Actualización habitual

### Después de cada carrera

Reemplazá solamente `data/championship.json`. La portada obtiene automáticamente de ese archivo:

- última carrera;
- ganador, equipo y tiempo;
- líderes del campeonato;
- clasificación completa;
- historial de resultados.

En GitHub Pages no hace falta hacer nada más. El sitio lee el JSON publicado cada vez que se abre. Para que la copia descargada también muestre esos datos al abrir `index.html` directamente, podés regenerar el respaldo local con:

```text
node scripts/build-data-snapshot.mjs
```

### Próxima fecha, enlaces e inscripción

Editá `data/site.json`. Ahí se concentran:

- próxima carrera y horario;
- outline del circuito;
- enlaces de YouTube, Instagram y servidor;
- precio, cupos, alias y enlaces de pago/WhatsApp;
- imágenes y colores de los equipos.

La página `inscripcion.html` toma automáticamente de esa configuración el precio, la cantidad de carreras, los cupos, el enlace de pago, el QR, el alias y el mensaje de WhatsApp. El QR listo para usar está en `img/payment/mercado-pago-qr.png` y apunta a `https://mpago.la/1AcqJZA`.

Si más adelante cambia el enlace de pago, reemplazá ese PNG y actualizá `paymentUrl`. También podés borrar la clave `paymentQrAsset`: la página volverá a generar el QR automáticamente en el navegador.

Para descontar lugares sin tocar HTML, modificá únicamente:

```text
data/site.json > registration > availableSlots
```

Cuando el valor llega a `0`, la web muestra “Cupos completos”, desactiva el pago y conserva el botón de WhatsApp para quienes ya pagaron. El enlace de la comunidad privada no se publica: se envía manualmente después de validar cada comprobante.

### Revista de la liga

Subí las páginas a `magazine/` manteniendo una numeración correlativa:

```text
mag_pag_1.png
mag_pag_2.png
mag_pag_3.png
```

También admite WEBP, JPG, JPEG y SVG, incluso mezclados. Los archivos deben estar dentro de `magazine/`, escritos en minúsculas y sin saltos en la numeración. La web los detecta automáticamente tanto en GitHub Pages como al abrir `index.html` desde la PC; no hace falta editar HTML, JavaScript ni JSON.

### Equipo o marca ficticia

1. Guardá su banner en `img/`.
2. Agregá una entrada en `data/site.json`, dentro de `teams`.
3. Usá exactamente ese mismo nombre de equipo en `championship.json`.

Esto permite cambiar Ferrari, Red Bull u otra marca por nombres personalizados sin tocar la lógica de la página.

Los logos de las marcas actuales ya están dentro de `img/` y se muestran automáticamente en las tablas. Solo hace falta agregar un archivo cuando aparezca una marca ficticia nueva.

### Imágenes ambientales

Las capturas optimizadas están en `img/media/` y se usan únicamente como fondos del carrusel, sus pestañas y distintas tarjetas de la portada. No existe una galería pública de capturas.

La selección principal del carrusel se edita en:

```text
data/site.json > media > carousel
```

Para reemplazar un fondo, guardá la imagen en esa carpeta y modificá su `src`. La captura de la transmisión que aparece dentro de la ventana de YouTube corresponde a `youtubeWindow`.

La revista incluye zoom de 100% a 300% mediante los botones `−` y `+`. También admite doble clic, `Ctrl` + rueda del mouse y las teclas `+`, `−` y `0`.

### Circuitos

Los outlines se guardan en `img/tracks/`. El calendario ya incluye los SVG correctos de sus 23 circuitos distintos. Para los datos del campeonato, asigná el archivo correspondiente mediante `trackAsset` en `data/site.json`.

## Publicación

Reemplazá el contenido del repositorio por el contenido de este proyecto y conservá el archivo `CNAME` para mantener el dominio actual.

## Dependencia incluida

QRCode.js queda incluido localmente bajo licencia MIT en `js/vendor/` como respaldo del QR estático.
