# Instrucciones Globales

- Responde siempre en español
- Todos los commits deben ser profesionales, descriptivos y en español
- Siempre que generes la lista de tareas y el plan debe ser en espanol
- Nunca realices pruebas en el navegador a menos de que yo lo indique explicitamente
- Verificar siempre con las skills
- Priorizar el uso de las skills
- Los nombres de las variables y funciones seran en espanol cuando se pueda
- Al escribir, redactar o modificar archivos README, el contenido debe ser profesional, elegante y diseñado para ser presentable como parte de un portafolio en GitHub
- Realiza solo lo descrito explicitamente, cualquier otra modificacion se debe consultar.
- No utilices el navegador para las pruebas a menos de lo que lo indique explicitamente. Todas las pruebas se haran manualmente.
- La carpeta docs-obsidian nunca de debe subir al repositorio remoto. Siempre debe estar en el .gitignore
- Las skills y los archivos de reglas siempre  deben estar en el gitignore y no debes subirse al repo remoto.


# Instrucciones Obsidian

- **Alias de Directorio (Obsidian = docs-obsidian):** Siempre que el usuario mencione la palabra "obsidian" (ej. "guárdalo en obsidian" o "lee el archivo de obsidian"), la IA debe interpretar automáticamente que la ruta de destino u origen es la carpeta local `docs-obsidian` del proyecto en el que se esté trabajando.
- **Protocolo de Arranque (Lectura Obligatoria):** Al iniciar una nueva sesión de desarrollo sobre un proyecto existente, la IA debe obligatoriamente leer primero los archivos clave de `docs-obsidian` del proyecto (Backlog de tareas, Design System, último Handover y Arquitectura) **antes de escribir una sola línea de código**. El usuario nunca debería tener que decir "revisa la documentación".
- Siempre que realices cambios arquitectónicos, añadas nuevos módulos o alteres el flujo de negocio, **debes revisar y actualizar** la base de Obsidian que se encuentra en la carpeta `docs-obsidian` de cada proyecto. Es obligatorio mantener el planteamiento técnico, los flujos y las tareas nuevas sincronizados con la realidad de la base de código.
- **Uso Obligatorio de Frontmatter:** Todo nuevo archivo Markdown generado para Obsidian debe incluir un bloque de YAML (Frontmatter) al inicio, conteniendo al menos `tags:` para categorizar y `date:` con la fecha de creación o actualización, para asegurar compatibilidad con plugins de gestión.
- **Cero Notas Huérfanas:** Nunca debe crearse una nota aislada en `docs-obsidian`. Todo nuevo documento debe obligatoriamente contener al menos un enlace bidireccional (`[[...]]`) referenciando a un índice maestro, al ecosistema principal o a archivos hermanos.
- **Formato Nativo y Elementos Visuales:** Para representar flujos lógicos o arquitecturas, utiliza obligatoriamente bloques de `mermaid`. Para resaltar información clave o advertencias, prioriza el uso de Callouts dinámicos de Obsidian (como `> [!INFO]`, `> [!WARNING]`, `> [!TODO]`).
- **Nomenclatura Limpia y Lógica:** Al crear nuevos documentos, utiliza prefijos numéricos para establecer el orden de lectura (ej. `01_`, `02_`) y evita usar espacios libres en los nombres de archivo (sustituidos por guiones bajos `_` o CamelCase), garantizando máxima compatibilidad global y un ordenamiento estricto en el panel de navegación.
- **Registro de Decisiones Arquitectónicas (ADRs):** Siempre que se tome una decisión técnica estructural sobre el código (cambio de frameworks, bases de datos o grandes librerías), debes generar un archivo `ADR_` explicando el contexto, la decisión adoptada de forma argumentada y las consecuencias.
- **Patrón de Índices Centrales (MOC):** Todo nuevo sub-folder, módulo complejo o área de alto nivel que se documente, debe contar obligatoriamente con una nota raíz (ej. `00_Index` o `00_MOC`) que actúe como agrupador y hub central de enlaces, evitando que el gráfico posea notas agrupadas sin jerarquía.
- **Bitácoras y Resoluciones (Post-Mortems):** Al resolver un bug crítico o refactorizar código problemático, registra obligatoriamente el suceso en una nota de mantenimiento, especificando el síntoma original, la causa raíz y la lógica técnica exacta detrás de la solución final.

# Instrucciones de Diseño y Retención de Memoria (Anti-Amnesia)

- **Control de Diseño (Design System Maestro):** Toda decisión estética (paletas de colores hexadecimales concretas, jerarquía tipográfica, estilos recurrentes de botones, márgenes fijos, animaciones) debe registrarse obligatoriamente en un archivo enfocado en el diseño (ej. `00_Design_System.md`). Obligatoriamente debo leer estos parámetros *antes* de proponer o construir cualquier interfaz nueva, asegurando consistencia visual absoluta y librando al usuario de tener que repetir qué colores de la marca queremos usar.
- **Handovers y Cierre de Sesión:** Cuando se alcance un hito, o el usuario indique que retomará el trabajo al "día siguiente", debo ir obligatoriamente a los Backlogs o crear una nota transitoria de progreso marcando: **¿En qué archivo nos detuvimos? ¿Qué variables quedaron a medias? y ¿Cuál es la primera tarea a encarar la próxima vez?**. El usuario *nunca* debería tener que re-explicar el contexto perdido al iniciar un nuevo chat.
- **Canon de Lógica de Negocio Automática:** Toda constante del negocio que se defina verbalmente durante el chat (como fórmulas matemáticas de envío, lógicas exactas para dividir cuotas financieras, roles de Firestore de lectura y escritura) debe llevarse de inmediato al archivo de Arquitectura respectivo. Siempre debo recurrir a esta "Biblia" antes de codificar la lógica Backend para evitar fallas o suposiciones mágicas.

# Filosofía DevOps y Ciclo de Vida (Mantenimiento de la Bóveda)

- **Poda Activa y Depuración (Vault Pruning):** La documentación debe tratarse con el mismo rigor que el código fuente. Si eliminamos una función técnica, cambiamos una base de datos o refactorizamos masivamente el proyecto, la IA debe ir obligatoriamente a la bóveda de Obsidian y marcar las notas antiguas con la etiqueta Frontmatter `status: obsoleto` o `deprecated`. Nunca se debe conservar documentación técnica de código eliminado o sin uso como si fuera la actual.
- **Registro de Entorno, Configuración y Snippets:** Cualquier configuración compleja de variables de entorno (`.env`), arreglos de dependencias ocultas (NPM conflicts), comandos densos de Firebase CLI o configuraciones de Vercel/Hosting que logremos hacer funcionar, deben registrarse de inmediato en un archivo de entorno (ej. `03_Entorno_Snippets.md`). La IA extraerá siempre los comandos complejos ejecutados con éxito hacia Obsidian.
- **Notas de Lanzamiento (Release Notes & Changelog Automático):** Cuando se alcance un hito de producción o se realice un despliegue principal a la rama principal (Deploy), la IA se encargará de cruzar las tareas tachadas en los `Backlogs`, purgar el documento y transformarlo en una `Release_Note` estructurada, documentando para un registro general qué características exactas componen la nueva versión del ecosistema.

# Reglas de UI/UX
- Si el proyecto ya cuenta con diseños establecidos, no crees nuevos sin consultar primero. Prioriza la consistencia visual y la armonía con el estilo existente.
- Evita controles nativos del navegador; usa componentes personalizados para alertas, selectores, desplegables y calendarios.
- Crea y reutiliza componentes siempre que sea posible para mantener el código modular, limpio y fácil de mantener.
- Siempre utiliza notificaciones de tipo toast al realizar acciones necesarias.
