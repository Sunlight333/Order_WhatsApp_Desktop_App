# ⚠️ IMPORTANT - Read This First!

## 🎯 Your Development Focus

**ALWAYS USE THESE DOCUMENTS DURING DEVELOPMENT:**

### 📋 Primary Reference (Use Continuously)

**`docs/12_COMPLETE_FEATURE_CHECKLIST.md`** ⭐⭐⭐
- **Contains ALL pages, functions, and events**
- **Check this BEFORE and AFTER implementing any feature**
- **Update as you complete items**
- **~15 pages, ~80+ functions, ~50+ events listed**

### 🗺️ Page Reference (Use Continuously)

**`docs/14_PAGE_NAVIGATION_MAP.md`** ⭐⭐
- **Shows ALL pages that need to be built**
- **Complete navigation structure**
- **User flows for common tasks**
- **Component breakdown per page**

### 📐 Implementation Order

**`docs/13_IMPLEMENTATION_PRIORITY_MAP.md`** ⭐
- **Correct order to implement features**
- **Feature dependencies**
- **Event flow diagrams**
- **Critical requirements highlighted**

---

## ✅ How to Ensure Nothing is Missed

### Before Starting Any Feature:

1. ✅ Open `docs/12_COMPLETE_FEATURE_CHECKLIST.md`
2. ✅ Find the feature section
3. ✅ Read ALL pages, functions, and events listed
4. ✅ Check `docs/14_PAGE_NAVIGATION_MAP.md` for page details
5. ✅ Review API design in `docs/03_API_DESIGN.md`
6. ✅ Then implement

### While Implementing:

1. ✅ Check off items as you complete them
2. ✅ Ensure ALL events are handled
3. ✅ Add toast notifications (NO alerts!)
4. ✅ Add confirmation modals for destructive actions
5. ✅ Handle all errors
6. ✅ Add loading states

### After Completing Feature:

1. ✅ Verify ALL checklist items are done
2. ✅ Test all functionality
3. ✅ Check all events work
4. ✅ Update `DEVELOPMENT_TRACKER.md`
5. ✅ Move to next feature

---

## 🚨 Critical Requirements (Cannot Skip!)

- ❌ **NO browser alerts** - Use toast notifications only
- ✅ **Order List = LIST VIEW** (NOT cards)
- ✅ **Quantity/Price = TEXT input** (no numeric arrows)
- ✅ **Multiple suppliers** per order
- ✅ **Multiple products** per supplier
- ✅ **NO order deletion** (prevent in code)
- ✅ **Click phone = WhatsApp** opens
- ✅ **Confirm destructive actions** with modals
- ✅ **All events show feedback** (toast/loading)
- ✅ **Complete audit trail** (every change logged)

---

## 📚 All Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `START_HERE.md` | Overview & workflow | First time setup |
| `docs/12_COMPLETE_FEATURE_CHECKLIST.md` | **Complete checklist** | **Continuously!** |
| `docs/14_PAGE_NAVIGATION_MAP.md` | All pages & navigation | **Continuously!** |
| `docs/13_IMPLEMENTATION_PRIORITY_MAP.md` | Implementation order | Planning phases |
| `docs/03_API_DESIGN.md` | API endpoints | Backend development |
| `docs/05_UI_UX_GUIDELINES.md` | Design system | Frontend development |
| `docs/11_MODERN_UI_COMPONENTS.md` | UI components | Building components |
| `DEVELOPMENT_TRACKER.md` | Progress log | Track daily progress |

---

## 🎯 Quick Start Development

```bash
# 1. Install everything
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Set up database
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 3. Open checklists
# - Open docs/12_COMPLETE_FEATURE_CHECKLIST.md
# - Open docs/14_PAGE_NAVIGATION_MAP.md
# - Keep them open while developing!

# 4. Start coding
npm run dev
```

---

## 💡 Development Workflow

```
Every Feature Implementation:

1. Check Feature Checklist → See what needs to be built
2. Check Page Map → Understand page structure
3. Check API Design → See endpoints
4. Implement → Build it
5. Verify → Check checklist again
6. Update → Mark items complete
```

---

**Remember: The feature checklist is your best friend! Use it constantly to ensure nothing is missed!** 🎯

