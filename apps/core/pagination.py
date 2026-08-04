from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class LegacyCompatiblePageNumberPagination(PageNumberPagination):
    """Bound collection responses while preserving the legacy JSON array contract."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200

    def paginate_queryset(self, queryset, request, view=None):
        if hasattr(queryset, "ordered") and not queryset.ordered:
            queryset = queryset.order_by("pk")
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        headers = {
            "X-Total-Count": str(self.page.paginator.count),
            "X-Page": str(self.page.number),
            "X-Page-Size": str(self.get_page_size(self.request)),
            "X-Total-Pages": str(self.page.paginator.num_pages),
        }
        links = []
        if self.get_previous_link():
            links.append(f'<{self.get_previous_link()}>; rel="prev"')
        if self.get_next_link():
            links.append(f'<{self.get_next_link()}>; rel="next"')
        if links:
            headers["Link"] = ", ".join(links)
        return Response(data, headers=headers)

    def get_paginated_response_schema(self, schema):
        return {"type": "array", "items": schema}
