import Navigation from "@/components/Navigation";
import { PricingContainer, PricingPlan } from "@/components/ui/pricing-container";
import { useTranslation } from "@/contexts/LanguageContext";

export function PricingDemo() {
  const { t } = useTranslation();

  const DEMO_PLANS: PricingPlan[] = [
    {
      name: "Arki (Free)",
      subtitle: t('pricing.subtitleArki'),
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        t('pricing.featureCapsules5'),
        t('pricing.featureTextImage'),
        t('pricing.featureFixedDates'),
        t('pricing.featureStandardSeal'),
        t('pricing.featureAccessForever'),
      ],
      isPopular: false,
      accent: "bg-rose-500",
      rotation: -2,
    },
    {
      name: "Kyklos (Starter)",
      subtitle: t('pricing.subtitleKyklos'),
      monthlyPrice: 199,
      yearlyPrice: 999,
      features: [
        t('pricing.featureCapsules5Monthly'),
        t('pricing.featureRollover'),
        t('pricing.featureTextImage'),
        t('pricing.featureEditBeforeSeal'),
        t('pricing.featurePriorityReminders'),
      ],
      isPopular: true,
      accent: "bg-blue-500",
      rotation: 1,
    },
    {
      name: "Aion (Pro)",
      subtitle: t('pricing.subtitleAion'),
      monthlyPrice: 399,
      yearlyPrice: 1999,
      features: [
        t('pricing.featureUnlimited'),
        t('pricing.featureVoiceVideo'),
        t('pricing.featureMultipleMessages'),
        t('pricing.featureLongTerm'),
        t('pricing.featureCustomSeal'),
        t('pricing.featurePriorityDelivery'),
      ],
      isPopular: false,
      accent: "bg-violet-500",
      rotation: 2,
    },
  ];

  return (
    <>
      <Navigation />
      <PricingContainer title={t('pricing.header')} plans={DEMO_PLANS} />
    </>
  );
}
