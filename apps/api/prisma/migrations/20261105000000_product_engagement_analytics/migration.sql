-- Additive first-party product analytics. Existing products, orders and customers remain unchanged.
CREATE TABLE `ProductEvent` (
  `id` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NULL,
  `visitorId` VARCHAR(36) NULL,
  `type` ENUM('CLICK','VIEW','CART_ADD','WISHLIST_ADD','CHECKOUT_START') NOT NULL,
  `dedupeKey` CHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ProductEvent_dedupeKey_key` (`dedupeKey`),
  INDEX `ProductEvent_productId_createdAt_idx` (`productId`,`createdAt`),
  INDEX `ProductEvent_type_createdAt_idx` (`type`,`createdAt`),
  INDEX `ProductEvent_userId_productId_createdAt_idx` (`userId`,`productId`,`createdAt`),
  INDEX `ProductEvent_visitorId_createdAt_idx` (`visitorId`,`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProductEvent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
