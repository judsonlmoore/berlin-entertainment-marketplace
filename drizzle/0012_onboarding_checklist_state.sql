CREATE TABLE "onboarding_checklist_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"searched_at" timestamp with time zone,
	"opened_result_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_checklist_state" ADD CONSTRAINT "onboarding_checklist_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
