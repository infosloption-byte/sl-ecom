-- Additive upgrade: preserves existing products, customers and orders.
ALTER TABLE `Product`
  ADD COLUMN `images` JSON NULL,
  ADD COLUMN `specifications` JSON NULL,
  ADD COLUMN `shortDescription` VARCHAR(320) NULL,
  ADD COLUMN `sku` VARCHAR(80) NULL,
  ADD UNIQUE INDEX `Product_sku_key` (`sku`);

ALTER TABLE `Order`
  ADD COLUMN `courierName` VARCHAR(120) NULL,
  ADD COLUMN `trackingNumber` VARCHAR(120) NULL,
  ADD COLUMN `trackingUrl` VARCHAR(500) NULL,
  ADD COLUMN `estimatedDeliveryAt` DATETIME(3) NULL;

CREATE TABLE `OrderStatusEvent` (
  `id` VARCHAR(64) NOT NULL,
  `orderId` VARCHAR(64) NOT NULL,
  `status` ENUM('PLACED','CONFIRMED','PACKED','SHIPPED','DELIVERED','CANCELLED') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdBy` VARCHAR(120) NULL,
  INDEX `OrderStatusEvent_orderId_createdAt_idx` (`orderId`,`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `OrderStatusEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve historical orders without inventing intermediate tracking steps.
INSERT INTO `OrderStatusEvent` (`id`,`orderId`,`status`,`createdAt`,`createdBy`)
SELECT UUID(),`id`,'PLACED',`createdAt`,'Store' FROM `Order`;
INSERT INTO `OrderStatusEvent` (`id`,`orderId`,`status`,`createdAt`,`createdBy`)
SELECT UUID(),`id`,`status`,`updatedAt`,'Store'
FROM `Order` WHERE `status` <> 'PLACED';
