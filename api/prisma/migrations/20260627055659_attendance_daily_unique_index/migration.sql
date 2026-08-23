-- Closes the gap the regular @@unique([studentId, date, classSubjectId])
-- can't cover: Postgres treats NULL as distinct from NULL, so two
-- whole-day (classSubjectId IS NULL) rows for the same student+date
-- wouldn't violate that constraint. This partial index protects exactly
-- that case at the database level, the last line of defense against a
-- double-submit race in AttendanceService#markAttendance creating a
-- duplicate daily attendance row.
CREATE UNIQUE INDEX "Attendance_daily_unique" ON "Attendance" ("studentId", "date") WHERE "classSubjectId" IS NULL;
