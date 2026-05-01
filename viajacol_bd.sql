-- ============================================================
--  ViajaCol – Diseño de Base de Datos
--  Agencia de Viajes Colombia
--  Motor: MySQL / MariaDB (compatible con PostgreSQL con ajustes menores)
-- ============================================================

-- ============================================================
-- TABLA 1: destinos
-- Almacena los destinos turísticos disponibles
-- ============================================================
CREATE TABLE destinos (
    id_destino       INT            NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(100)   NOT NULL,
    descripcion      TEXT,
    precio_vuelo     DECIMAL(12, 2) NOT NULL COMMENT 'Precio vuelo ida y vuelta en COP',
    precio_noche     DECIMAL(12, 2) NOT NULL COMMENT 'Precio estadía por noche en COP',
    imagen_url       VARCHAR(500),
    activo           TINYINT(1)     NOT NULL DEFAULT 1,
    fecha_creacion   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_destino),
    UNIQUE KEY uq_destino_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Destinos turísticos disponibles';


-- ============================================================
-- TABLA 2: clientes
-- Almacena los datos personales de los viajeros
-- ============================================================
CREATE TABLE clientes (
    id_cliente       INT            NOT NULL AUTO_INCREMENT,
    nombre_completo  VARCHAR(200)   NOT NULL,
    correo           VARCHAR(150)   NOT NULL,
    telefono         VARCHAR(20)    NOT NULL,
    fecha_registro   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_cliente),
    UNIQUE KEY uq_cliente_correo (correo),
    INDEX idx_cliente_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Datos personales de los clientes';


-- ============================================================
-- TABLA 3: reservas
-- Relaciona clientes con destinos y guarda los detalles del viaje
-- ============================================================
CREATE TABLE reservas (
    id_reserva       INT            NOT NULL AUTO_INCREMENT,
    id_cliente       INT            NOT NULL,
    id_destino       INT            NOT NULL,
    fecha_ida        DATE           NOT NULL,
    fecha_regreso    DATE           NOT NULL,
    num_noches       INT            NOT NULL COMMENT 'Calculado automáticamente',
    precio_vuelo     DECIMAL(12, 2) NOT NULL COMMENT 'Precio vuelo al momento de reservar',
    precio_noche     DECIMAL(12, 2) NOT NULL COMMENT 'Precio noche al momento de reservar',
    precio_total     DECIMAL(12, 2) NOT NULL COMMENT 'vuelo + (noches * precio_noche)',
    estado           ENUM('pendiente', 'confirmada', 'cancelada') NOT NULL DEFAULT 'confirmada',
    fecha_reserva    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones    TEXT,

    PRIMARY KEY (id_reserva),
    CONSTRAINT fk_reserva_cliente  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_destino  FOREIGN KEY (id_destino) REFERENCES destinos(id_destino) ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_reserva_fecha (fecha_ida),
    INDEX idx_reserva_estado (estado),

    CONSTRAINT chk_fechas CHECK (fecha_regreso > fecha_ida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Reservas de viaje realizadas';


-- ============================================================
-- DATOS INICIALES – Destinos
-- ============================================================
INSERT INTO destinos (nombre, descripcion, precio_vuelo, precio_noche, imagen_url) VALUES
(
    'Santa Marta',
    'La ciudad más antigua de Colombia. Playas paradisíacas, la Sierra Nevada y el Parque Tayrona en un mismo destino.',
    250000.00,
    250000.00,
    'https://images.unsplash.com/photo-1599834562135-b6fc90e642ca?w=600'
),
(
    'Cartagena',
    'La ciudad amurallada del Caribe colombiano. Calles coloniales, islas cristalinas y gastronomía única.',
    250000.00,
    250000.00,
    'https://images.unsplash.com/photo-1569959220744-ff553533f492?w=600'
),
(
    'Medellín',
    'La ciudad de la eterna primavera. Innovación, cultura, parques y vida nocturna en el corazón de Antioquia.',
    250000.00,
    250000.00,
    'https://images.unsplash.com/photo-1599158150601-1417ebbaafb0?w=600'
);


-- ============================================================
-- DATOS DE EJEMPLO – Clientes y Reservas
-- ============================================================
INSERT INTO clientes (nombre_completo, correo, telefono) VALUES
('Ana María Torres',     'ana.torres@email.com',    '3101234567'),
('Carlos Rodríguez',     'carlos.rod@email.com',    '3209876543'),
('Laura Gómez Pérez',    'laura.gomez@email.com',   '3151112233');

INSERT INTO reservas (id_cliente, id_destino, fecha_ida, fecha_regreso, num_noches, precio_vuelo, precio_noche, precio_total, estado) VALUES
(1, 1, '2025-07-10', '2025-07-15', 5, 250000.00, 250000.00, 1500000.00, 'confirmada'),
(2, 2, '2025-08-01', '2025-08-05', 4, 250000.00, 250000.00, 1250000.00, 'confirmada'),
(3, 3, '2025-09-20', '2025-09-24', 4, 250000.00, 250000.00, 1250000.00, 'pendiente');


-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista completa de reservas (para el panel web)
CREATE OR REPLACE VIEW v_reservas_detalle AS
SELECT
    r.id_reserva,
    c.nombre_completo,
    c.correo,
    c.telefono,
    d.nombre              AS destino,
    r.fecha_ida,
    r.fecha_regreso,
    r.num_noches,
    r.precio_vuelo,
    r.precio_noche,
    r.precio_total,
    r.estado,
    r.fecha_reserva
FROM reservas r
JOIN clientes  c ON r.id_cliente  = c.id_cliente
JOIN destinos  d ON r.id_destino  = d.id_destino
ORDER BY r.fecha_reserva DESC;


-- Vista de estadísticas por destino
CREATE OR REPLACE VIEW v_estadisticas_destinos AS
SELECT
    d.nombre                        AS destino,
    COUNT(r.id_reserva)             AS total_reservas,
    SUM(r.precio_total)             AS ingresos_totales,
    AVG(r.num_noches)               AS promedio_noches,
    MAX(r.fecha_reserva)            AS ultima_reserva
FROM destinos d
LEFT JOIN reservas r ON d.id_destino = r.id_destino AND r.estado != 'cancelada'
GROUP BY d.id_destino, d.nombre;


-- ============================================================
-- STORED PROCEDURE – Crear reserva completa
-- (inserta cliente si no existe y crea la reserva)
-- ============================================================
DELIMITER $$

CREATE PROCEDURE sp_crear_reserva(
    IN  p_nombre     VARCHAR(200),
    IN  p_correo     VARCHAR(150),
    IN  p_telefono   VARCHAR(20),
    IN  p_destino    INT,
    IN  p_fecha_ida  DATE,
    IN  p_fecha_reg  DATE,
    OUT p_resultado  VARCHAR(100)
)
BEGIN
    DECLARE v_id_cliente  INT DEFAULT 0;
    DECLARE v_precio_v    DECIMAL(12,2);
    DECLARE v_precio_n    DECIMAL(12,2);
    DECLARE v_noches      INT;
    DECLARE v_total       DECIMAL(12,2);

    -- Buscar o crear cliente
    SELECT id_cliente INTO v_id_cliente
    FROM clientes WHERE correo = p_correo LIMIT 1;

    IF v_id_cliente = 0 THEN
        INSERT INTO clientes (nombre_completo, correo, telefono)
        VALUES (p_nombre, p_correo, p_telefono);
        SET v_id_cliente = LAST_INSERT_ID();
    END IF;

    -- Obtener precios del destino
    SELECT precio_vuelo, precio_noche
    INTO v_precio_v, v_precio_n
    FROM destinos WHERE id_destino = p_destino AND activo = 1;

    IF v_precio_v IS NULL THEN
        SET p_resultado = 'ERROR: Destino no encontrado o inactivo';
        LEAVE sp_crear_reserva;
    END IF;

    -- Calcular noches y total
    SET v_noches = DATEDIFF(p_fecha_reg, p_fecha_ida);
    SET v_total  = v_precio_v + (v_noches * v_precio_n);

    -- Insertar reserva
    INSERT INTO reservas (id_cliente, id_destino, fecha_ida, fecha_regreso, num_noches, precio_vuelo, precio_noche, precio_total)
    VALUES (v_id_cliente, p_destino, p_fecha_ida, p_fecha_reg, v_noches, v_precio_v, v_precio_n, v_total);

    SET p_resultado = CONCAT('OK: Reserva #', LAST_INSERT_ID(), ' creada. Total: $', FORMAT(v_total, 0));
END$$

DELIMITER ;


-- ============================================================
-- EJEMPLO DE USO DEL PROCEDURE
-- ============================================================
/*
CALL sp_crear_reserva(
    'Juan Pérez',
    'juan.perez@email.com',
    '3001234567',
    1,                    -- id_destino: 1=Santa Marta, 2=Cartagena, 3=Medellín
    '2025-10-01',
    '2025-10-05',
    @resultado
);
SELECT @resultado;

-- Consultar todas las reservas con detalle:
SELECT * FROM v_reservas_detalle;

-- Ver estadísticas por destino:
SELECT * FROM v_estadisticas_destinos;
*/
