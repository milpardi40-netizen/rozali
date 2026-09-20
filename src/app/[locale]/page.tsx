import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import {
  ArtistsSection,
  B2BCustomSection,
  BestSellersSection,
  CategoriesSection,
  DiscoverySection,
  EducationSection,
  ExclusiveSection,
  NewsletterSection,
  NewArrivalsSection,
  PatternRail,
  PortfoliosSection,
  ProjectsSection,
  SpacesSection,
  StoriesSection,
  StylesSection,
} from "@/components/home/sections";
import { artistStats, enrichEducation, enrichPattern, enrichPortfolio, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { t } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const meta = site.seo.find((s) => s.path === "/");
  return { title: meta ? { absolute: t(meta.title, locale) } : undefined, description: meta ? t(meta.description, locale) : undefined };
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];

  const sections = site.homeSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const on = (k: string) => sections.some((s) => s.key === k);

  const patterns = site.patterns.map((p) => enrichPattern(site, p));
  const products = site.products.slice().sort((a, b) => a.order - b.order).map((p) => enrichProduct(site, p));
  const portfolios = site.portfolios.map((p) => enrichPortfolio(site, p));
  const education = site.education.map((e) => enrichEducation(site, e));
  const artists = site.artists
    .filter((a) => a.featured)
    .map((a) => {
      const s = artistStats(site, a.id);
      return { ...a, featuredPattern: s.patterns[0] ?? null, portfolioPreview: s.portfolios.map((p) => p.cover), counts: { patterns: s.patterns.length, projects: s.portfolios.length } };
    });
  const heroPatterns = site.hero.featuredPatternIds.map((id) => site.patterns.find((p) => p.id === id)).filter(Boolean) as typeof site.patterns;
  const styleCounts = Object.fromEntries(site.categories.map((c) => [c.id, site.patterns.filter((p) => p.categoryId === c.id).length]));
  const featuredCats = site.categories.filter((c) => c.featured).sort((a, b) => a.order - b.order);

  /* education: featured first, then popular-only — dedup by id */
  const educationItems = (() => {
    const seen = new Set<string>();
    return [...education.filter((e) => e.featured), ...education.filter((e) => !e.featured && e.popular)]
      .filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
  })();

  return (
    <>
      {on("hero") && (
        <Hero
          hero={site.hero}
          patterns={heroPatterns}
          categories={featuredCats}
          stats={{
            patterns: site.hero.stats?.patterns ?? site.patterns.length,
            artists: site.hero.stats?.artists ?? site.artists.length,
            projects: site.hero.stats?.projects ?? site.portfolios.length,
          }}
        />
      )}
      {on("discovery") && <DiscoverySection patterns={patterns.filter((p) => p.featured)} categories={featuredCats} />}
      {on("categories") && site.spaces.length > 0 && <CategoriesSection spaces={site.spaces.slice().sort((a, b) => a.order - b.order)} />}
      {on("trending") && <PatternRail id="trending" eyebrow={d.common.trending} title={d.home.trendingTitle} description={d.home.trendingDesc} patterns={patterns.filter((p) => p.trending)} hrefPath="/patterns?sort=trending" tone="secondary" />}
      {on("bestSellers") && <BestSellersSection patterns={patterns.filter((p) => p.bestSeller)} products={products.filter((p) => p.bestSeller)} />}
      {on("newPatterns") && (
        <NewArrivalsSection
          patterns={patterns.filter((p) => p.isNew)}
          products={products.filter((p) => p.isNew)}
        />
      )}
      {on("artists") && <ArtistsSection artists={artists} />}
      {on("portfolios") && <PortfoliosSection items={portfolios.filter((p) => p.featured)} eyebrow={d.nav.portfolio} title={d.home.portfolioTitle} description={d.home.portfolioDesc} hrefPath="/portfolio" />}
      {on("styles") && <StylesSection categories={featuredCats} counts={styleCounts} />}
      {on("spaces") && <SpacesSection spaces={site.spaces.slice().sort((a, b) => a.order - b.order)} />}
      {on("exclusive") && (
        <ExclusiveSection
          products={products.filter((p) => !p.artistId && p.featured)}
          heroImage={site.editorialImages?.exclusiveHero ?? site.hero.image}
        />
      )}
      {on("projects") && <ProjectsSection items={portfolios.filter((p) => p.isProject)} />}
      {on("education") && <EducationSection items={educationItems} />}
      {(on("b2b") || on("custom")) && (
        <B2BCustomSection
          showB2B={on("b2b")}
          showCustom={on("custom")}
          image1={site.editorialImages?.b2bImage1 ?? site.hero.image}
          image2={site.editorialImages?.b2bImage2 ?? site.hero.image}
        />
      )}
      {on("stories") && <StoriesSection stories={site.stories} artists={site.artists} />}
      {on("newsletter") && <NewsletterSection />}
    </>
  );
}
