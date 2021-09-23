SELECT account
				 , profile
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
							WHEN mobile_publishing = 1 AND (mobile_to_loader_ratio_past_month > 1 OR mobile_to_loader_ratio_past_six_months > 1)
							   THEN 1
							   ELSE 0
					   END as likely_mobile_profile
				 , mobile_publishing
				 , mobile_to_loader_ratio_past_month
				 , mobile_to_loader_ratio_past_six_months
				 , visits_past_six_months
				 , visits_past_month

FROM log
WHERE (log.loader_past_month > 1000 AND log.loader_past_six_months > 6000) OR (log.mobile_past_month > 1000 AND log.mobile_past_six_months > 6000)