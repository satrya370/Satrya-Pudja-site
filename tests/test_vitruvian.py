"""Dependency-free checks: python -m unittest discover -s tests -v."""

import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects/vitruvian-bali/index.html"
BASE = "https://satrya370.github.io/Satrya-Pudja-site/"
LIVE = "https://vitruvianbali.com/pilates-denpasar/"


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.source = path.read_text(encoding="utf-8")
        self.elements = []
        self.feed(self.source)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    @property
    def ids(self):
        return [a["id"] for _, a in self.elements if "id" in a]


class VitruvianPortfolioTests(unittest.TestCase):
    def setUp(self):
        self.home = Page(ROOT / "index.html")
        self.project = Page(PROJECT)

    def test_experience_and_homepage_links(self):
        self.assertIn("vitruvian-experience", self.home.ids)
        self.assertIn("AI-Assisted Digital Marketing &amp; Web Developer", self.home.source)
        self.assertIn("Sep 2026 – Nov 2026 · Freelance", self.home.source)
        self.assertIn("View Project Case Study", self.home.source)
        links = [a.get("href") for t, a in self.home.elements if t == "a"]
        self.assertGreaterEqual(links.count("projects/vitruvian-bali/"), 2)
        self.assertIn(LIVE, links)

    def test_local_links_assets_and_fragments(self):
        for page in [self.home, self.project]:
            for tag, attrs in page.elements:
                value = attrs.get("href") if tag in {"a", "link"} else attrs.get("src")
                if not value:
                    continue
                url = urlsplit(value)
                if url.scheme or url.netloc:
                    continue
                with self.subTest(page=page.path.name, link=value):
                    self.assertFalse(url.path.startswith("/"), "Use base-path-safe relative URLs")
                    target = (page.path.parent / unquote(url.path)).resolve() if url.path else page.path
                    self.assertTrue(target.is_relative_to(ROOT))
                    if target.is_dir():
                        target /= "index.html"
                    self.assertTrue(target.exists(), f"Missing local target: {target}")
                    if url.fragment and target.suffix == ".html":
                        self.assertIn(unquote(url.fragment), Page(target).ids)

    def test_seo_and_structured_data(self):
        canonical = [a.get("href") for t, a in self.project.elements
                     if t == "link" and a.get("rel") == "canonical"]
        self.assertEqual(canonical, [BASE + "projects/vitruvian-bali/"])
        meta = {a.get("property", a.get("name")): a.get("content")
                for t, a in self.project.elements if t == "meta"}
        for key in ["description", "og:title", "og:description", "og:url", "og:image", "og:image:alt"]:
            self.assertTrue(meta.get(key), key)
        self.assertEqual(meta["og:url"], canonical[0])
        schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>',
                             self.project.source, re.S)
        self.assertEqual(len(schemas), 1)
        schema = json.loads(schemas[0])
        self.assertEqual(schema["@type"], "CreativeWork")
        self.assertEqual(schema["url"], canonical[0])

    def test_heading_ids_and_images(self):
        self.assertEqual(sum(t == "h1" for t, _ in self.project.elements), 1)
        self.assertEqual(len(self.project.ids), len(set(self.project.ids)))
        images = [a for t, a in self.project.elements if t == "img"]
        self.assertEqual(len(images), 2)
        for image in images:
            self.assertGreater(len(image.get("alt", "")), 40)
            self.assertTrue(image.get("width"))
            self.assertTrue(image.get("height"))

    def test_status_and_privacy_boundaries(self):
        text = self.project.source
        for phrase in ["still requiring validation", "No verified performance dataset",
                       "not proof of successful production collection",
                       "AI was a development assistant"]:
            self.assertIn(phrase, text)
        self.assertNotIn("LayerFit AI Creative Generator.html", self.home.source + text)
        for tag, attrs in self.project.elements:
            if tag == "a" and attrs.get("target") == "_blank":
                self.assertIn("noopener", attrs.get("rel", ""))

    def test_existing_project_links_and_core_skills_remain(self):
        for name in ["jtb-marketing-site", "kura2bus-site", "haribersama-site",
                     "meta-ads-site", "ig-content-builder-site", "receipt-ocr-site",
                     "swot-site", "geo-builder-site", "itinerary-site",
                     "academic-review-site", "telco-churn-site", "layerfit-site"]:
            self.assertIn(f'href="{name}/"', self.home.source)
        for skill in ["n8n", "RAG", "REST APIs", "JavaScript", "Agentic AI", "OAuth 2.0"]:
            self.assertIn(f'class="skill-chip">{skill}</span>', self.home.source)
        skills_section = self.home.source.split("Skills &amp; stack</h2>")[1].split("</section>")[0]
        skills = re.findall(r'class="skill-chip">(.*?)</span>', skills_section)
        self.assertEqual(len(skills), len(set(skills)), "Duplicate core-skill labels")


if __name__ == "__main__":
    unittest.main()
