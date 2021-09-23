SELECT account
				 , profile
				 , (account || '/' || profile) AS account_and_profile
				 , prod_version
				 , privacy_manager
				 , ccpa
				 , ccpa_load_rule
				 , consent_prompt
				 , consent_preferences
				 , consent_manager_load_rule
				 , consent_logging
				 , cmp_extension
				 , cmp_usercentrics
				 , cmp_onetrust
				 , cmp_didomi
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

FROM log

WHERE 
  /* only export production-level traffic (this is a pretty low bar for that) */
  ((loader_past_month > 1000 AND loader_past_six_months > 6000) OR (mobile_past_month > 1000 AND mobile_past_six_months > 6000))