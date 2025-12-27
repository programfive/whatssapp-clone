# WhatsApp Clone - Next.js & Supabase

![WhatsApp Clone Mockup](./public/mockup.png)

Un clon de WhatsApp moderno y funcional construido con las últimas tecnologías web. Este proyecto replica la experiencia de usuario de WhatsApp Web, integrando mensajería en tiempo real, gestión de estados, grupos y personalización de interfaz.

## 🚀 Características Principales

- **Mensajería en Tiempo Real**: Envío y recepción de mensajes instantáneos utilizando Supabase Realtime Channels.
- **Autenticación Completa**: Sistema de registro e inicio de sesión seguro gestionado por Supabase Auth.
- **Chats Grupales e Individuales**: Soporte para conversaciones directas y creación de grupos dinámicos.
- **Estados (Stories)**: Visualización y publicación de estados con expiración automática de 24 horas.
- **Indicadores de Actividad**: Notificaciones de "escribiendo..." en tiempo real y confirmaciones de lectura.
- **Reacciones a Mensajes**: Interactúa con los mensajes mediante emojis.
- **Personalización de Interfaz**:
  - Soporte completo para **Modo Oscuro** y **Modo Claro**.
  - Cambiador de fondos de pantalla (wallpapers) para el chat.
- **Gestión de Perfil**: Actualización de nombre, avatar y estados de "Acerca de".
- **Búsqueda Avanzada**: Filtrado de chats por texto y tipos (No leídos, Favoritos, Grupos).

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos y Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Componentes UI**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **Validación**: [Zod](https://zod.dev/)
- **Utilidades**: `date-fns`, `emoji-picker-react`, `next-themes`

## 📦 Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto localmente:

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd clone-whatsapp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_anon_de_supabase
```

### 4. Inicializar la base de datos
Aplica las migraciones contenidas en `supabase/migrations` en tu instancia de Supabase.

### 5. Ejecutar en modo desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📂 Estructura del Proyecto

```text
├── app/               # Rutas de Next.js (Auth, Layouts, Pages)
├── components/        # Componentes de la UI (WhatsApp, UI base)
│   └── whatsapp/      # Componentes específicos de la lógica de WhatsApp
├── hooks/             # Hooks personalizados de React
├── lib/               # Utilidades de configuración (Supabase client, etc.)
├── public/            # Archivos estáticos e imágenes (Mockups, assets)
└── supabase/          # Migraciones de base de datos y configuración
```

## Licencia

Proyecto personal / educativo. Ajusta la licencia según tus necesidades.
