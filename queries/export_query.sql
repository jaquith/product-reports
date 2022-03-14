
SELECT account
				 , profile
				 , (account || '/' || profile) AS account_and_profile
				 , prod_version
				 , all_consent_tools
				 , ccpa_load_rule
				 , consent_manager_load_rule
				 , CASE
						WHEN (cmp_detected IS NULL OR cmp_detected = '') AND (consent_preferences = 1 OR consent_prompt = 1)
						   THEN 'teal_cm'
						WHEN (cmp_detected IS NULL OR cmp_detected = '') AND (privacy_manager = 1)
						   THEN 'teal_pm'
						WHEN cmp_detected IS NOT NULL AND cmp_detected != ''
						   THEN 'cmp'
						   ELSE 'none_found'
					   END AS consent_solution_summary
			    , cmp_detected
			    , privacy_manager
				 , ccpa
				 , consent_prompt
				 , consent_preferences
				 , consent_logging
				 , cmp_extension

				 , CASE
						WHEN (cmp_detected IS NULL OR cmp_detected = '') AND (consent_preferences = 1 OR consent_prompt = 1)
						   THEN 1
						   ELSE 0
					   END AS cm_alone
				 , CASE
						WHEN (cmp_detected IS NULL OR cmp_detected = '') AND (privacy_manager = 1)
						   THEN 1
						   ELSE 0
					   END AS pm_alone
				 , CASE
						WHEN cmp_detected IS NOT NULL AND cmp_detected != ''
						   THEN 1
						   ELSE 0
					   END AS has_cmp
					   
				 , CASE
							WHEN mobile_publishing = 1 AND (mobile_30_days >= loader_30_days  > 1 OR mobile_180_days >= loader_180_days)
							   THEN 1
							   ELSE 0
					   END AS likely_mobile_profile
				 , CASE
						WHEN consent_preferences = 1 OR consent_prompt = 1
						   THEN 1
						   ELSE 0
					   END AS has_consent_manager
				 , CASE
							WHEN mobile_publishing = 1 AND (mobile_30_days >= loader_30_days OR mobile_180_days >= loader_180_days)
							   THEN 1
							   ELSE 0
					   END AS likely_mobile_profile
				 , mobile_publishing
				 , visit_180_days as visits_past_six_months
				 , loader_180_days as loader_past_six_months
				 , mobile_180_days as mobile_past_six_months
				 , visit_30_days as visits_past_month
				 , loader_30_days as loader_past_month
				 , mobile_30_days as mobile_past_month
FROM iq_profiles

WHERE 
  /* only export production-level traffic (this is a pretty low bar for that) */
  ((loader_past_month > 1000 AND loader_past_six_months > 6000) OR (mobile_past_month > 1000 AND mobile_past_six_months > 6000))