# Feature Modules

Each feature module (Auth, Academic, Student, Attendance, Score, Fee, Payment, Communication, etc. — see `docs/18-technical-architecture.md` §3) gets its own folder here:

```
modules/
  <feature>/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    dto/
```

Nothing lives here yet — the first feature module (`auth/`) is added in Stage 1. See `prompts/stage-01-auth-rbac-data-model/01-backend-prompt.md`.
