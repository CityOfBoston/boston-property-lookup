# Content Architecture Documentation

## Overview

This document describes the refactored content architecture for the Property Details system. The refactoring establishes clear ownership, separation of concerns, and maintainability without changing any user-facing behavior.

## Architecture Principles

### 1. Clear Ownership
Each module has a single, well-defined responsibility documented in its header comment.

### 2. Separation of Concerns
- **Services**: Content resolution and data access
- **Presenters**: React element creation
- **Logic Hooks**: Business logic and calculations
- **Content Hooks**: Coordination of services, presenters, and logic

### 3. Dependency Flow
```
Components
    ↓
Content Hooks (coordination)
    ↓
├─→ Services (content resolution)
├─→ Logic Hooks (business logic)
└─→ Presenters (React elements)
        ↓
    Services (for content)
```

## Directory Structure

```
frontend/src/
├── services/
│   └── content/
│       ├── ContentService.ts         # OWNS: YAML content resolution
│       ├── LanguageService.ts        # OWNS: Language string resolution
│       └── index.ts
├── presenters/
│   ├── ExemptionPresenter.ts        # OWNS: Exemption React elements
│   ├── PropertyTaxPresenter.ts      # OWNS: Tax React elements
│   └── index.ts
├── hooks/
│   ├── content/                      # Coordination hooks
│   │   ├── usePropertyTaxesContent.ts
│   │   ├── usePropertyValueContent.ts
│   │   ├── useOverviewContent.ts
│   │   ├── useAttributesContent.ts
│   │   ├── useContactUsContent.ts
│   │   ├── useAbatementsContent.ts
│   │   ├── useApprovedPermitsContent.ts
│   │   ├── useExemptionValues.ts
│   │   └── index.ts
│   ├── logic/                        # Business logic hooks
│   │   ├── useExemptionPhases.ts
│   │   └── index.ts
│   ├── usePropertyDetailsContent.ts  # Main coordinator (re-exports)
│   └── usePropertyTaxCalculations.ts # Tax calculations
└── utils/
    └── markdown/
        ├── markdownRenderer.ts       # OWNS: Markdown to React conversion
        └── index.ts
```

## Module Responsibilities

### Services Layer

#### ContentService
**Location**: `services/content/ContentService.ts`

**OWNS**:
- Component content resolution from YAML
- Reference resolution (@ syntax)
- Base/instance configuration merging

**DOES NOT**:
- Create React elements
- Handle business logic
- Manage state

**Usage**:
```typescript
import { contentService } from '@services/content/ContentService';

const content = contentService.getComponentContent('PropertyValueSection');
const shared = contentService.getCommonContent();
```

#### LanguageService
**Location**: `services/content/LanguageService.ts`

**OWNS**:
- Language string resolution from periods.yaml
- Template variable replacement
- Structured content access (links, phones)

**DOES NOT**:
- Determine phases or periods
- Create React elements
- Handle business logic

**Usage**:
```typescript
import { languageService } from '@services/content/LanguageService';

const message = languageService.getPropertyTaxMessage('residential_preliminary_submitted', {
  current_fy: 2026
});
```

### Presenters Layer

#### ExemptionPresenter
**Location**: `presenters/ExemptionPresenter.ts`

**OWNS**:
- Creation of React elements for exemption messages
- Creation of React elements for exemption descriptions
- Phase-specific content rendering
- Personal exemption links generation

**DOES NOT**:
- Determine which phase we're in
- Resolve content from YAML
- Handle business logic

**Usage**:
```typescript
import { ExemptionPresenter } from '@presenters/ExemptionPresenter';

const presenter = new ExemptionPresenter({
  fiscalYear: 2026,
  calendarYear: 2025,
  isPrelimPeriod: true,
  displayFY: 2026,
  residentialExemptionMaxAmount: 3000
});

const message = presenter.createResidentialExemptionMessage('preliminary', true);
```

#### PropertyTaxPresenter
**Location**: `presenters/PropertyTaxPresenter.ts`

**OWNS**:
- Creation of tax-related React elements
- Message box content generation
- URL construction with parcel IDs
- Tax payment button creation

**DOES NOT**:
- Determine tax phases
- Resolve content from YAML
- Handle business logic

**Usage**:
```typescript
import { PropertyTaxPresenter } from '@presenters/PropertyTaxPresenter';

const presenter = new PropertyTaxPresenter({
  fiscalYear: 2026,
  calendarYear: 2025,
  displayFY: 2026,
  parcelId: '123456',
  residentialGranted: true,
  residentialExemptionPhase: { phase: 'open' }
});

const header = presenter.createTaxRateHeader();
```

### Logic Hooks Layer

#### useExemptionPhases
**Location**: `hooks/logic/useExemptionPhases.ts`

**OWNS**:
- Exemption phase determination
- Exemption status calculations
- Granted status based on amounts

**DOES NOT**:
- Create React elements
- Resolve content
- Format values for display

**Usage**:
```typescript
import { useExemptionPhases } from '@hooks/logic/useExemptionPhases';

const phases = useExemptionPhases({
  residentialExemptionAmount: 3000,
  residentialExemptionFlag: true,
  personalExemptionAmount: 0,
  personalExemptionFlag: false
});
```

### Content Hooks Layer

#### usePropertyTaxesContent
**Location**: `hooks/content/usePropertyTaxesContent.ts`

**OWNS**:
- Coordination of tax content assembly
- Integration of calculations, phases, and presenters
- Drawer options construction

**DOES NOT**:
- Perform calculations directly
- Create React elements directly
- Resolve content directly

**Usage**:
```typescript
import { usePropertyTaxesContent } from '@hooks/content/usePropertyTaxesContent';

const taxContent = usePropertyTaxesContent(propertyTaxData);
```

#### usePropertyValueContent
**Location**: `hooks/content/usePropertyValueContent.ts`

**OWNS**:
- Property value display coordination
- Show/hide state for value history
- Historical values formatting

**Usage**:
```typescript
import { usePropertyValueContent } from '@hooks/content/usePropertyValueContent';

const valueContent = usePropertyValueContent(propertyValueData);
```

#### useOverviewContent
**Location**: `hooks/content/useOverviewContent.ts`

**OWNS**:
- Overview section coordination
- Property type label formatting
- Exemption status display
- Overview cards construction

**Usage**:
```typescript
import { useOverviewContent } from '@hooks/content/useOverviewContent';

const overviewContent = useOverviewContent(overviewData);
```

#### useAttributesContent
**Location**: `hooks/content/useAttributesContent.ts`

**OWNS**:
- Attributes section coordination
- Show/hide state for attributes
- Scroll behavior management

**Usage**:
```typescript
import { useAttributesContent } from '@hooks/content/useAttributesContent';

const attributesContent = useAttributesContent(attributesData);
```

### Utilities Layer

#### markdownRenderer
**Location**: `utils/markdown/markdownRenderer.ts`

**OWNS**:
- Markdown to React element conversion
- Bold text handling (**text**)
- Link handling [text](url)

**DOES NOT**:
- Handle business logic
- Resolve content
- Manage state

**Usage**:
```typescript
import { renderMarkdown, getMarkdownText } from '@utils/markdown/markdownRenderer';

const element = renderMarkdown('This is **bold** text with a [link](https://example.com)');
```

## Migration Guide

### For Component Authors

The public API remains unchanged. Components should continue importing from `@hooks/usePropertyDetailsContent`:

```typescript
// Before and After - No changes needed
import { usePropertyTaxesContent } from '@hooks/usePropertyDetailsContent';

function MyComponent() {
  const content = usePropertyTaxesContent(data);
  // ... use content as before
}
```

### For Content Updates

Content is still managed in the same YAML files:
- `frontend/src/utils/content.yaml` - Component content
- `frontend/src/utils/periods.yaml` - Time-based language

### For Adding New Features

1. **New Content Section**: Create a new hook in `hooks/content/`
2. **New Business Logic**: Create a new hook in `hooks/logic/`
3. **New Presentation Logic**: Create a new presenter in `presenters/`
4. **New Content Source**: Extend services in `services/content/`

## Benefits of This Architecture

### 1. Clear Ownership
Every module has explicit documentation about what it owns and what it doesn't.

### 2. Testability
- Services can be tested independently
- Presenters can be tested with mock services
- Logic hooks can be tested with mock data
- Content hooks can be tested with dependency injection

### 3. Maintainability
- Changes to content resolution only affect services
- Changes to React element creation only affect presenters
- Changes to business logic only affect logic hooks
- Changes are isolated to their respective layers

### 4. Reusability
- Services are reusable across the application
- Presenters can be used in different contexts
- Logic hooks can be composed
- Content hooks can be extended

### 5. Type Safety
- All modules export proper TypeScript types
- Dependencies are explicitly typed
- No runtime type errors

## Examples

### Example 1: Adding a New Tax Message

1. Add message to `periods.yaml`:
```yaml
periods:
  property_taxes:
    new_message: "This is a new message for FY{current_fy}"
```

2. Use in presenter:
```typescript
// In PropertyTaxPresenter.ts
createNewMessage(): React.ReactNode {
  return renderMarkdown(
    getMarkdownText(
      languageService.getPropertyTaxMessage('new_message', {
        current_fy: this.context.fiscalYear
      })
    )
  );
}
```

3. Use in content hook:
```typescript
// In usePropertyTaxesContent.ts
const newMessage = taxPresenter.createNewMessage();
```

### Example 2: Adding a New Calculation

1. Create logic hook:
```typescript
// hooks/logic/useNewCalculation.ts
export function useNewCalculation(data: Data) {
  // calculation logic
  return result;
}
```

2. Use in content hook:
```typescript
// hooks/content/useMyContent.ts
import { useNewCalculation } from '@hooks/logic/useNewCalculation';

export function useMyContent(data: Data) {
  const calculation = useNewCalculation(data);
  // ... use calculation
}
```

### Example 3: Adding a New Section

1. Create content hook:
```typescript
// hooks/content/useNewSectionContent.ts
export function useNewSectionContent(data: Data) {
  const content = contentService.getComponentContent('NewSection');
  // ... coordinate content
  return { content, /* ... */ };
}
```

2. Export from main coordinator:
```typescript
// hooks/usePropertyDetailsContent.ts
export { useNewSectionContent } from './content/useNewSectionContent';
```

3. Use in component:
```typescript
import { useNewSectionContent } from '@hooks/usePropertyDetailsContent';
```

## Testing Strategy

### Unit Tests
- Services: Test content resolution independently
- Presenters: Test with mock services
- Logic hooks: Test with mock data
- Utilities: Test pure functions

### Integration Tests
- Content hooks: Test coordination with real services
- Components: Test with real hooks

### E2E Tests
- Full user flows remain unchanged

## Backward Compatibility

All existing imports continue to work:
- ✅ `import { usePropertyTaxesContent } from '@hooks/usePropertyDetailsContent'`
- ✅ `import { getStringValue, getUrlValue } from '@hooks/usePropertyDetailsContent'`
- ✅ `import { renderMarkdown } from '@hooks/usePropertyDetailsContent'`

New imports are also available:
- ✅ `import { contentService } from '@services/content/ContentService'`
- ✅ `import { ExemptionPresenter } from '@presenters/ExemptionPresenter'`
- ✅ `import { useExemptionPhases } from '@hooks/logic/useExemptionPhases'`

## Summary

This refactoring establishes a clear, maintainable architecture with:
- **Services** for content resolution
- **Presenters** for React element creation
- **Logic Hooks** for business logic
- **Content Hooks** for coordination
- **Utilities** for pure functions

Each layer has clear ownership and responsibilities, making the codebase easier to understand, test, and maintain.

