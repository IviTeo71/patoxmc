const NPOINT_URL = "https://api.npoint.io/25eb152a01c2ad02972f";

const DB = {
    initialStructure: { users: [], forum: [], settings: { admins: [] } },

    async load() {
        const cache = localStorage.getItem('patox_db_cache');
        let localData = cache ? JSON.parse(cache) : this.initialStructure;

        try {
            console.log("Intentando cargar datos de npoint...");
            const response = await fetch(NPOINT_URL);

            if (!response.ok) {
                console.warn("npoint respondió con error:", response.status);
                throw new Error("npoint_error");
            }

            const cloudData = await response.json();

            // Validar si la nube tiene datos útiles (no es [] ni {})
            if (cloudData && !Array.isArray(cloudData) && Object.keys(cloudData).length > 0) {
                // Sincronizar local con nube si la nube es superior o igual en usuarios
                if ((cloudData.users?.length || 0) >= (localData.users?.length || 0)) {
                    console.log("Datos de la nube cargados correctamente.");
                    localStorage.setItem('patox_db_cache', JSON.stringify(cloudData));
                    return cloudData;
                }
            }

            console.log("Usando datos locales (nube vacía o desactualizada).");
            return localData;
        } catch (e) {
            console.warn("Cargando desde almacenamiento local (CORS/Offline):", e);
            return localData;
        }
    },

    async save(data) {
        // Guardar SIEMPRE en local primero para evitar pérdida de datos
        localStorage.setItem('patox_db_cache', JSON.stringify(data));
        console.log("Datos guardados localmente.");

        try {
            console.log("Sincronizando con npoint...");
            const response = await fetch(NPOINT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log("Sincronización con la nube exitosa.");
            } else {
                console.error("Error al sincronizar con npoint:", response.status);
            }

            // Devolvemos SIEMPRE true para que el sistema de Auth/Foro no bloquee al usuario.
            // Los datos ya están seguros en localStorage.
            return true;
        } catch (e) {
            console.error("Error de red/CORS al sincronizar:", e);
            return true;
        }
    }
};

window.DB_SYSTEM = DB;
