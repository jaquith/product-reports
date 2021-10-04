
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
							WHEN mobile_publishing = 1 AND (mobile_to_loader_ratio_past_month > 1 OR mobile_to_loader_ratio_past_six_months >1)
							   THEN 1
							   ELSE 0
					   END AS likely_mobile_profile
				 , CASE
						WHEN consent_preferences = 1 OR consent_prompt = 1
						   THEN 1
						   ELSE 0
					   END AS has_consent_manager
				 , CASE
							WHEN mobile_publishing = 1 AND (mobile_to_loader_ratio_past_month > 1 OR mobile_to_loader_ratio_past_six_months >1)
							   THEN 1
							   ELSE 0
					   END AS likely_mobile_profile
				 , mobile_publishing
				 , visits_past_six_months
				 , loader_past_six_months
				 , mobile_past_six_months
				 , visits_past_month
				 , loader_past_month
				 , mobile_past_month
				 , volume_per_visit_one_month
				 , volume_per_visit_six_months
FROM log

WHERE 
  /* only export production-level traffic (this is a pretty low bar for that) */
  ((loader_past_month > 1000 AND loader_past_six_months > 6000) OR (mobile_past_month > 1000 AND mobile_past_six_months > 6000))