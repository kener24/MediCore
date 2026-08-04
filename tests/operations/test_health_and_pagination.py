from unittest.mock import patch

from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.core.pagination import LegacyCompatiblePageNumberPagination


class HealthEndpointTests(TestCase):
    def test_health_endpoints_are_public_and_not_cached(self):
        for path in ("/health/", "/health/live/", "/health/ready/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")

    @patch("apps.core.views.connection.cursor", side_effect=RuntimeError("database unavailable"))
    def test_readiness_fails_closed_without_internal_details(self, _cursor):
        response = self.client.get("/health/ready/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable", "database": "unavailable"})


class PaginationContractTests(TestCase):
    def test_bounded_response_preserves_array_contract(self):
        request = Request(APIRequestFactory().get("/api/example/?page=2&page_size=10"))
        paginator = LegacyCompatiblePageNumberPagination()
        page = paginator.paginate_queryset(list(range(25)), request)
        response = paginator.get_paginated_response(page)

        self.assertEqual(response.data, list(range(10, 20)))
        self.assertEqual(response.headers["X-Total-Count"], "25")
        self.assertEqual(response.headers["X-Page"], "2")
        self.assertEqual(response.headers["X-Page-Size"], "10")
