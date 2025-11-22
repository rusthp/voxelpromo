# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Rulebook task management system integration
- Quality check scripts (type-check, lint:fix, test:coverage)
- Vectorizer MCP support documentation
- Comprehensive documentation in `/docs` directory
- Pagination support for AliExpress product collection
- Duplicate prevention system for offers
- Bulk selection and deletion UI for offers
- BRL currency conversion for AliExpress products
- Coupon extraction from AliExpress API
- Price accuracy improvements with detailed logging

### Changed
- Improved AliExpress price extraction logic
- Enhanced pagination handling in CollectorService
- Updated frontend to show all offers (removed 20 offer limit)
- Improved duplicate detection using product URL and ID
- Better error handling for API responses

### Fixed
- Fixed pagination loop logic in CollectorService
- Fixed duplicate prevention to only check active offers
- Fixed dashboard statistics calculation (avgDiscount, counts)
- Fixed price conversion to handle BRL prices from API
- Fixed frontend display of reviewsCount (hide when 0)
- Fixed soft delete preventing re-collection of products

## [1.0.0] - 2025-11-17

### Added
- Initial project setup
- Backend API with Express
- Frontend with Next.js
- MongoDB integration
- AliExpress API integration
- Mercado Livre API integration
- Amazon PA-API integration (planned)
- RSS feed parsing
- AI content generation (Groq/OpenAI)
- Telegram bot integration
- WhatsApp integration
- Authentication system
- Dashboard with statistics
- Offer management system

