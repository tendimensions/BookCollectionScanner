# Book Collection Scanner - Requirements and Design Document

**Project Name:** Book Collection Scanner  
**Document Version:** 2.0  
**Date:** March 8, 2026  
**Status:** Requirements Finalized - Ready for Development

---

## 1. Executive Summary

This document outlines the requirements and design for a personal ISBN barcode book scanner and cataloging application. The system consists of two primary components:

1. **Mobile Client Application** - A camera-based barcode scanner for continuous ISBN capture
2. **Web Server Application** - Backend API and administrative interface for data management

The application enables users to rapidly scan and catalog books by ISBN, automatically retrieving book metadata and organizing items by categories and tags.

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```text
┌─────────────────────┐
│  Mobile Client App  │
│   (Phone/Tablet)    │
│  - Barcode Scanner  │
│  - Category/Tag UI  │
└──────────┬──────────┘
           │ HTTPS/API
           │
┌──────────▼──────────┐
│   Web Server App    │
│  - REST API         │
│  - Admin Interface  │
│  - Database         │
└─────────────────────┘
           │
┌──────────▼──────────┐
│  External ISBN API  │
│  (e.g., Google      │
│   Books, OpenLib)   │
└─────────────────────┘
```

### 2.2 Component Breakdown

- **Mobile Client**: Flutter cross-platform application (iOS & Android) with camera barcode scanning
- **Web Server**: Python FastAPI RESTful backend with React admin interface
- **Database**: SQLite for persistent storage of book records, categories, and tags
- **External ISBN API**: Google Books API (primary) with Open Library API (fallback)
- **Deployment**: Docker container on local server, mDNS for service discovery

---

## 3. Mobile Client Application Requirements

**Important:** The mobile app is designed exclusively for creating book records through barcode scanning. All editing and deleting operations (for categories, tags, and book records) are handled through the admin web interface. This keeps the mobile app streamlined and focused on rapid data entry.

### 3.1 Initial Screen (Category & Tag Selection)

#### 3.1.1 Functional Requirements

- **FR-MC-001**: Display a dropdown/picker for category selection (single selection)
- **FR-MC-002**: Display a multi-select interface for tag selection (multiple allowed)
- **FR-MC-003**: Provide "Add New Category" functionality if desired category doesn't exist
- **FR-MC-004**: Provide "Add New Tag" functionality if desired tag doesn't exist
- **FR-MC-005**: Display "Start Scanning" button (enabled when category is selected)
- **FR-MC-006**: On first launch or when lists are empty, allow users to create categories/tags
- **FR-MC-007**: Mobile app can only SELECT existing or CREATE new categories/tags; editing and deleting categories/tags is restricted to admin interface only

#### 3.1.2 Data Flow

1. App launches → Fetch categories from server API
2. App launches → Fetch tags from server API
3. User adds new category → POST to server → Update local category list
4. User adds new tag → POST to server → Update local tag list
5. User selects category + tags → Navigate to scanning screen

### 3.2 Scanning Screen (Barcode Capture)

#### 3.2.1 Functional Requirements

- **FR-MC-101**: Activate device camera with barcode detection enabled
- **FR-MC-102**: Display "Stop Scanning" button overlay at all times
- **FR-MC-103**: Implement continuous barcode scanning (no user interaction required between scans)
- **FR-MC-104**: On successful barcode scan:
  - Play audible beep sound
  - Extract ISBN from barcode
  - Call external ISBN API to retrieve book metadata
  - On API success: Send book data + category + tags to server API
  - On API error: Display error message briefly, continue scanning
  - Return to scanning state automatically
- **FR-MC-105**: "Stop Scanning" button returns user to initial screen with category/tag selection
- **FR-MC-106**: Mobile app creates book records only; editing and deleting book records is restricted to admin interface only

#### 3.2.2 Non-Functional Requirements

- **NFR-MC-101**: Barcode scanning must be continuous and hands-free
- **NFR-MC-102**: Audio feedback must be immediate (< 200ms latency)
- **NFR-MC-103**: Error messages should be non-intrusive (toast/banner) and auto-dismiss
- **NFR-MC-104**: Camera should support autofocus and various lighting conditions

### 3.3 User Experience Flow

```text
[Launch App]
     ↓
[Initial Screen: Select Category & Tags]
     ↓
[Click "Start Scanning"]
     ↓
[Scanning Screen: Camera Active]
     ↓
[Continuous Loop:]
  → Detect barcode
  → Beep
  → Fetch ISBN data
  → Save to server
  → Continue scanning
     ↓
[Click "Stop Scanning"]
     ↓
[Return to Initial Screen]
```

---

## 4. Web Server Application Requirements

### 4.1 Authentication & Security

#### 4.1.1 Requirements

- **FR-WS-001**: No authentication required (personal use, single user)
- **FR-WS-002**: Server should be accessible only on local network or VPN (security note)

### 4.2 API Endpoints

#### 4.2.1 Category Management

- **FR-WS-101**: `GET /api/categories` - Retrieve all categories (used by mobile & admin)
- **FR-WS-102**: `POST /api/categories` - Create new category (used by mobile & admin)
- **FR-WS-103**: `PUT /api/categories/{id}` - Update category (**admin interface only**)
- **FR-WS-104**: `DELETE /api/categories/{id}` - Delete category (**admin interface only**)

#### 4.2.2 Tag Management

- **FR-WS-201**: `GET /api/tags` - Retrieve all tags (used by mobile & admin)
- **FR-WS-202**: `POST /api/tags` - Create new tag (used by mobile & admin)
- **FR-WS-203**: `PUT /api/tags/{id}` - Update tag (**admin interface only**)
- **FR-WS-204**: `DELETE /api/tags/{id}` - Delete tag (**admin interface only**)

#### 4.2.3 Book Record Management

- **FR-WS-301**: `POST /api/books` - Create new book record with ISBN data, category, and tags (used by mobile)
- **FR-WS-302**: `GET /api/books` - Retrieve all book records (used by admin page)
- **FR-WS-303**: `GET /api/books/{id}` - Retrieve specific book record (used by admin page)
- **FR-WS-304**: `PUT /api/books/{id}` - Update book record (category/tags) (**admin interface only**)
- **FR-WS-305**: `DELETE /api/books/{id}` - Delete book record (**admin interface only**)

### 4.3 Administrative Web Interface

**Note:** The admin web interface is the exclusive location for all editing and deleting operations. This includes managing categories, tags, and book records. The separation of concerns keeps the mobile app simple and focused on scanning.

#### 4.3.1 Main View Requirements

- **FR-WS-401**: Display all book records in a table/grid format
- **FR-WS-402**: Each record displays:
  - Book title
  - Author(s)
  - ISBN
  - Category
  - Tags
  - Thumbnail image (if available)
  - Publication year
  - Other relevant ISBN metadata
- **FR-WS-403**: Each record has a visible "Delete" button
- **FR-WS-404**: Records are clickable to open detail/edit panel

#### 4.3.2 Detail/Edit Panel Requirements

- **FR-WS-501**: Clicking a record opens a slide-out panel
- **FR-WS-502**: Panel displays all book metadata fields
- **FR-WS-503**: Panel allows editing of:
  - Category (dropdown selection)
  - Tags (multi-select interface)
- **FR-WS-504**: Panel has "Save" button to commit changes
- **FR-WS-505**: Panel has "Cancel" button to discard changes and close
- **FR-WS-506**: ISBN metadata fields are read-only (cannot be edited)

#### 4.3.3 UI/UX Requirements

- **NFR-WS-401**: Admin interface should be responsive (desktop and tablet)
- **NFR-WS-402**: Slide-out panel animation should be smooth
- **NFR-WS-403**: Provide visual feedback for save/delete operations
- **NFR-WS-404**: Implement confirmation dialog for delete operations

#### 4.3.4 Category and Tag Management

- **FR-WS-601**: Admin interface provides functionality to edit category names
- **FR-WS-602**: Admin interface provides functionality to delete categories (with validation to prevent deletion if books are assigned)
- **FR-WS-603**: Admin interface provides functionality to edit tag names
- **FR-WS-604**: Admin interface provides functionality to delete tags (with validation to prevent deletion if books are tagged)
- **FR-WS-605**: Category and tag management can be accessed through dedicated management screens or inline editing

### 4.4 Database Schema (Preliminary)

#### 4.4.1 Tables

**Categories**

- `id` (Primary Key)
- `name` (Unique)
- `created_at`
- `updated_at`

**Tags**

- `id` (Primary Key)
- `name` (Unique)
- `created_at`
- `updated_at`

**Books**

- `id` (Primary Key)
- `isbn` (Indexed, may not be unique due to re-scans)
- `title`
- `authors` (JSON or text)
- `publisher`
- `published_date`
- `description`
- `page_count`
- `thumbnail_url`
- `language`
- `category_id` (Foreign Key → Categories)
- `isbn_raw_data` (JSON - full response from ISBN API)
- `created_at`
- `updated_at`

**Book_Tags** (Many-to-Many Junction Table)

- `book_id` (Foreign Key → Books)
- `tag_id` (Foreign Key → Tags)
- `created_at`

---

## 5. External Dependencies

### 5.1 ISBN Lookup API

The system requires integration with an external ISBN API service:

**Candidate Services:**

- Google Books API
- Open Library API
- ISBNdb API
- Worldcat Search API

**Required Capabilities:**

- Lookup by ISBN-10 or ISBN-13
- Return comprehensive book metadata
- Reasonable rate limits for personal use
- Free or low-cost tier available

---

## 6. Technology Stack - Final Decisions

### 6.1 Mobile Client

**Framework:** Flutter  
**Target Platforms:** iOS and Android  
**Barcode Scanning:** flutter_barcode_scanner or mobile_scanner package  
**Rationale:** Cross-platform development for maximum accessibility and development efficiency

**Key Features:**

- Single codebase for both iOS and Android
- Native performance for camera and barcode scanning
- Rich UI component library
- Active community and package ecosystem

### 6.2 Web Server

**Backend Framework:** Python with FastAPI  
**Rationale:** Simplicity, performance, and ease of development for RESTful APIs

**Key Features:**

- Automatic OpenAPI documentation
- Type hints and validation with Pydantic
- Async support for better performance
- Easy integration with SQLAlchemy ORM

### 6.3 Database

**Database System:** SQLite  
**Rationale:** Simplicity and suitability for personal use, no complex database setup required

**Key Features:**

- Zero-configuration required
- File-based database (easy backup)
- Sufficient for up to 10,000 book records
- Embedded directly in application

### 6.4 Admin Interface

**Frontend Framework:** React with Material-UI  
**Rationale:** Rapid development with polished UI components

**Key Features:**

- Component-based architecture
- Rich ecosystem of libraries
- Material Design components for professional look
- Responsive design out of the box

### 6.5 External APIs

**Primary:** Google Books API  
**Fallback:** Open Library API  
**Strategy:** Attempt Google Books first, fall back to Open Library on failure or rate limit

**Rationale:**

- Google Books provides high-quality, comprehensive data
- Open Library ensures availability when Google Books is unavailable
- No cost for personal use levels

### 6.6 Deployment

**Infrastructure:** Docker container on local server  
**Server Port:** 8000 (configurable via environment variable)  
**Protocol:** HTTP (local network only)  
**Service Discovery:** mDNS/Bonjour for automatic server detection  

**Rationale:**

- Docker provides consistent deployment environment
- Local server deployment suitable for personal use
- mDNS eliminates need for manual IP configuration
- HTTP acceptable for local network (no external exposure)

---

## 7. Non-Functional Requirements

### 7.1 Performance

- **NFR-001**: Barcode scanning should process within 1 second of detection
- **NFR-002**: ISBN API lookup should complete within 3 seconds (network dependent)
- **NFR-003**: Book record save to server should complete within 2 seconds
- **NFR-004**: Admin page should load all records within 5 seconds (for up to 5,000 books)

### 7.2 Reliability

- **NFR-005**: Mobile app should handle network disconnections gracefully
- **NFR-006**: Server API should return appropriate HTTP status codes and error messages
- **NFR-007**: Database should maintain referential integrity

### 7.3 Usability

- **NFR-008**: Mobile app should be operable single-handed during scanning
- **NFR-009**: Admin interface should be intuitive without training
- **NFR-010**: Error messages should be clear and actionable

### 7.4 Scalability

- **NFR-011**: System should support up to 10,000 book records initially
- **NFR-012**: System should support up to 100 categories and 500 tags

---

## 8. Development Phases

### Phase 1: Foundation

- Set up development environment
- Design and implement database schema
- Create basic server API endpoints
- Test database operations

### Phase 2: Server Implementation

- Implement all category/tag/book APIs
- Build admin web interface skeleton
- Implement book record display
- Implement edit/delete functionality

### Phase 3: Mobile Client

- Set up mobile app project
- Implement category/tag selection screen
- Implement barcode scanning functionality
- Integrate with ISBN API
- Integrate with server API

### Phase 4: Polish & Testing

- Refine UI/UX on both platforms
- End-to-end testing
- Error handling improvements
- Performance optimization

---

## 9. Design Decisions

This section documents the key design decisions made for the Book Collection Scanner application.

### 9.1 Data Management

**Duplicate ISBN Handling**

- The system allows duplicate ISBN entries to accommodate multiple copies of the same book
- Each scan creates a new record in the database
- Users can manage duplicates through the admin interface if needed

**Category Requirements**

- Category selection is mandatory before scanning
- Books cannot exist without a category
- No default "Uncategorized" category provided
- Users must create at least one category before first use

**Tag Limitations**

- Maximum of 10 tags per book
- This limit balances flexibility with UI manageability and database performance

**ISBN Data Storage**

- Full raw JSON response from ISBN API is stored in the database
- Provides flexibility for future enhancements without re-fetching data
- ISBN-13 format used as primary identifier
- Auto-detection and conversion from ISBN-10 to ISBN-13

### 9.2 Mobile App Behavior

**Network Connectivity**

- Internet connection required for app functionality
- No offline mode or local data synchronization
- App displays error on launch if server connection unavailable

**Scan History**

- No scan history displayed on mobile app
- Users verify scanned books through admin web interface
- Keeps mobile interface focused on scanning experience

**Barcode Support**

- Restricted to ISBN barcode formats only
- May be revisited if practical issues arise

**Scan Feedback**

- Audible beep on successful scan (fixed, non-customizable)
- Different error beep for scan failures
- Error messages displayed as toast notifications (3-second auto-dismiss)
- No haptic feedback in MVP

**Multiple Barcode Detection**

- Error beep and message displayed if multiple barcodes detected simultaneously
- Prevents accidental scans

**Mobile App Scope - Create Only**

- Mobile app is designed exclusively for creating records (books, categories, and tags)
- Users can SELECT existing or CREATE new categories and tags
- All editing and deleting operations are handled exclusively by the admin web interface
- This architectural decision keeps the mobile app streamlined and focused on rapid scanning
- Reduces complexity in the mobile app UI/UX
- Centralizes data management operations in one place (admin interface)

### 9.3 ISBN API Integration

**API Strategy**

- Primary: Google Books API
- Fallback: Open Library API
- Google Books takes precedence for data quality

**Lookup Failure Handling**

- If no results found, store ISBN without metadata
- Display non-intrusive error message
- Continue scanning without interruption
- Users can manually add metadata later via admin interface

**Rate Limiting**

- No specific rate limiting handling implemented
- Fallback API provides redundancy

### 9.4 Admin Interface Features

**Pagination**

- Display up to 100 records per page

**Search and Filtering**

- Search by title, author, ISBN, category, and tags
- Essential for managing large collections

**Sorting**

- Sortable by title, author, publication date, and category
- Default sort: newest additions first

**Bulk Operations**

- Not included in MVP
- Planned for future enhancement

**Image Handling**

- Book cover images linked to external URLs (from ISBN API)
- Caching implemented in admin interface for performance
- Lazy loading for images on admin page

**Category/Tag Management**

- Admin interface is the exclusive location for editing and deleting categories and tags
- Can be implemented through dedicated management screens or inline editing functionality
- Validation required to prevent deletion of categories/tags that are in use
- Mobile app can only select existing or create new categories/tags

**Data Export/Import**

- Export functionality: JSON format via button in admin interface
- Import functionality: Same JSON format supported
- Enables database sharing and backup

### 9.5 Error Handling

**Network Failures**

- Mobile app displays error message if server connection lost
- Impacts ability to load categories/tags on initial screen

**Server Storage Failures**

- Server returns HTTP 500 with descriptive error message
- Mobile app displays non-intrusive error notification
- Basic retry logic may be implemented

**Invalid Barcodes**

- Validation logic detects malformed or non-ISBN barcodes
- Error beep and message displayed
- Scanning continues without interruption

**Memory Management**

- Camera resources released after each scan
- Temporary data cleared after successful save
- Monitoring to prevent crashes during extended sessions

### 9.6 Data Management

**Backup Strategy**

- No automated backup required
- Manual export to JSON file available

**Database Indexing**

- ISBN field indexed for query performance
- category_id field indexed for filtering

### 9.7 User Experience

**Internationalization**

- English only for MVP
- No multi-language support

**Dark Mode**

- Not included in MVP

**Audio Customization**

- Fixed beep sounds, not customizable in MVP

---

## 10. Future Enhancements (Out of Scope for MVP)

These items are noted for potential future development but not required for initial version:

- Multi-user support with authentication
- Book lending/borrowing tracking
- Reading status (read, to-read, currently reading)
- Star ratings and personal reviews
- Advanced search with filters
- Statistics and collection analytics
- Barcode scanning of other media (DVDs, video games)
- Integration with Goodreads or other services
- Mobile app for browsing collection (read-only mode)
- Book condition tracking
- Purchase price and collection value tracking
- Wishlist functionality

---

## 11. Next Steps

With all requirements and design decisions finalized, the following development steps are ready to commence:

1. **Database schema finalization** - Complete detailed table designs with all fields and relationships
2. **API contract definition** - Document request/response formats for all endpoints with examples
3. **Development environment setup** - Configure Flutter, Python/FastAPI, React, and Docker environments
4. **UI/UX mockups** - Create wireframes for mobile app screens and admin interface layouts
5. **Phase 1 - Foundation** - Set up Docker container, implement database schema, create basic API endpoints
6. **Phase 2 - Server Implementation** - Build complete REST API and admin web interface
7. **Phase 3 - Mobile Client** - Develop Flutter app with barcode scanning and server integration
8. **Phase 4 - Testing & Polish** - End-to-end testing, error handling refinement, performance optimization

---

## 12. Glossary

- **ISBN**: International Standard Book Number - unique identifier for books
- **ISBN-10**: 10-digit ISBN format (older standard)
- **ISBN-13**: 13-digit ISBN format (current standard)
- **API**: Application Programming Interface
- **REST**: Representational State Transfer (API architectural style)
- **HTTPS**: Hypertext Transfer Protocol Secure
- **UPC**: Universal Product Code
- **EAN**: European Article Number
- **MVP**: Minimum Viable Product
- **mDNS**: Multicast DNS (for local network service discovery)
- **ORM**: Object-Relational Mapping
- **NAS**: Network Attached Storage
- **VPS**: Virtual Private Server

---

**Document Status**: ✅ **FINALIZED** - All requirements defined, all design decisions made, ready for development.
