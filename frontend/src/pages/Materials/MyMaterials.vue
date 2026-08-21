<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="[{ label: __('My Purchases'), route: { name: 'MyMaterials' } }]" />
		</template>
	</LayoutHeader>
	<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
		<!-- Purchased materials -->
		<h1 class="text-xl-semibold text-ink-gray-9">{{ __('My Materials') }}</h1>
		<SkeletonLoader v-if="materials.loading" variant="list" :count="2" class="mt-5" />
		<EmptyStateLayout
			v-else-if="!materials.data?.length"
			name="Purchases"
			icon="lucide-shopping-bag"
			:description="__('You haven’t purchased any materials yet.')"
		/>
		<div v-else class="mt-5 space-y-5">
			<div
				v-for="pack in materials.data"
				:key="pack.bundle"
				class="rounded-xl border border-outline-gray-2 bg-surface-white p-5"
			>
				<div class="text-base-semibold text-ink-gray-9">{{ pack.title }}</div>
				<div class="mt-3 divide-y divide-outline-gray-2">
					<div
						v-for="file in pack.files"
						:key="file.file_url"
						class="flex items-center justify-between gap-3 py-2.5"
					>
						<div class="flex min-w-0 items-center gap-2">
							<span class="lucide-file-text size-4 shrink-0 text-ink-gray-5" />
							<span class="truncate text-p-sm text-ink-gray-8">{{ file.label }}</span>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<a :href="file.file_url" target="_blank" rel="noopener">
								<Button variant="subtle" size="sm">{{ __('View') }}</Button>
							</a>
							<a :href="file.file_url" :download="file.label">
								<Button variant="outline" size="sm">
									<template #prefix><span class="lucide-download size-4" /></template>
									{{ __('Download') }}
								</Button>
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Order history -->
		<h2 class="mt-10 text-lg font-semibold text-ink-gray-9">{{ __('Order History') }}</h2>
		<div v-if="orders.data?.length" class="mt-4 overflow-hidden rounded-xl border border-outline-gray-2">
			<div
				v-for="order in orders.data"
				:key="order.name"
				class="flex items-center justify-between gap-3 border-b border-outline-gray-2 bg-surface-white px-4 py-3 last:border-b-0"
			>
				<div class="min-w-0">
					<div class="truncate text-p-sm-medium text-ink-gray-8">{{ order.title }}</div>
					<div class="text-xs text-ink-gray-5">{{ formatDate(order.creation) }}</div>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<span class="text-p-sm text-ink-gray-8">
						{{ formatCurrencyWithCode(order.amount, order.currency) }}
					</span>
					<Badge :theme="order.paid ? 'green' : 'red'" variant="subtle" size="sm"
						:label="order.paid ? __('Paid') : __('Failed')" />
					<a v-if="order.paid" :href="receiptUrl(order.name)" target="_blank" rel="noopener">
						<Button variant="ghost" size="sm">
							<template #prefix><span class="lucide-receipt size-4" /></template>
							{{ __('Receipt') }}
						</Button>
					</a>
				</div>
			</div>
		</div>
		<p v-else class="mt-4 text-p-sm text-ink-gray-5">{{ __('No orders yet.') }}</p>
	</div>
</template>

<script setup>
import { createResource, Button, Badge, Breadcrumbs, usePageMeta } from 'frappe-ui'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import EmptyStateLayout from '@/components/Layouts/EmptyStateLayout.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { formatCurrencyWithCode } from '@/utils/localize'

const materials = createResource({ url: 'celpipedu.api.materials.get_my_materials', auto: true })
const orders = createResource({ url: 'celpipedu.api.materials.get_my_orders', auto: true })

function receiptUrl(paymentLog) {
	return (
		'/api/method/celpipedu.api.materials.download_receipt?payment_log=' +
		encodeURIComponent(paymentLog)
	)
}
function formatDate(d) {
	if (!d) return ''
	return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

usePageMeta(() => ({ title: __('My Purchases') }))
</script>
