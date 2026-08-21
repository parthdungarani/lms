<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="[{ label: __('Manage Materials'), route: { name: 'ManageMaterials' } }]" />
		</template>
		<template #right-header>
			<Button variant="solid" @click="openNew">
				<template #prefix><span class="lucide-plus size-4" /></template>
				{{ __('New Bundle') }}
			</Button>
		</template>
	</LayoutHeader>

	<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
		<div v-if="!bundles.data?.length" class="text-p-sm text-ink-gray-5">
			{{ __('No bundles yet. Create one to get started.') }}
		</div>
		<div v-else class="space-y-2">
			<button
				v-for="b in bundles.data"
				:key="b.name"
				class="flex w-full items-center justify-between rounded-lg border border-outline-gray-2 bg-surface-white px-4 py-3 text-left hover:border-outline-gray-3"
				:class="{ 'ring-1 ring-ink-gray-9': selected?.name === b.name }"
				@click="select(b.name)"
			>
				<div>
					<div class="text-p-sm-medium text-ink-gray-8">{{ b.title }}</div>
					<div class="text-xs text-ink-gray-5">
						{{ formatCurrencyWithCode(b.amount, b.currency) }}
					</div>
				</div>
				<Badge :theme="b.published ? 'green' : 'gray'" variant="subtle" size="sm"
					:label="b.published ? __('Published') : __('Draft')" />
			</button>
		</div>

		<!-- Editor for the selected bundle -->
		<div v-if="selected" class="mt-6 rounded-xl border border-outline-gray-2 bg-surface-white p-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<FormControl v-model="selected.title" :label="__('Title')" />
				<FormControl v-model="selected.amount" type="number" :label="__('Amount')" />
				<FormControl v-model="selected.currency" :label="__('Currency')" />
				<FormControl v-model="selected.published" type="checkbox" :label="__('Published')" />
			</div>
			<FormControl
				v-model="selected.description"
				type="textarea"
				:label="__('Description')"
				class="mt-4"
			/>
			<Button class="mt-4" variant="solid" :loading="saving" @click="saveBundle">
				{{ __('Save details') }}
			</Button>

			<div class="mt-6 border-t border-outline-gray-2 pt-4">
				<div class="text-base-semibold text-ink-gray-8">{{ __('PDF Files') }}</div>
				<div class="mt-2 divide-y divide-outline-gray-2">
					<div
						v-for="f in selected.files"
						:key="f.row_name"
						class="flex items-center justify-between gap-3 py-2.5"
					>
						<div class="flex min-w-0 items-center gap-2">
							<span class="lucide-file-text size-4 shrink-0 text-ink-gray-5" />
							<span class="truncate text-p-sm text-ink-gray-8">{{ f.label }}</span>
						</div>
						<Button variant="ghost" theme="red" size="sm" :loading="saving" @click="removeFile(f)">
							{{ __('Remove') }}
						</Button>
					</div>
					<p v-if="!selected.files?.length" class="py-2 text-p-sm text-ink-gray-5">
						{{ __('No files yet.') }}
					</p>
				</div>

				<!-- Upload a new PDF -->
				<div class="mt-4 flex flex-wrap items-end gap-3">
					<FormControl
					v-model="newFileLabel"
					:label="__('File label (optional — defaults to file name)')"
					class="flex-1"
				/>
					<FileUploader
						:key="uploaderKey"
						:fileTypes="['.pdf']"
						:uploadArgs="{ private: 1 }"
						@success="onUpload"
					>
						<template #default="{ openFileSelector, uploading, progress }">
							<Button
								variant="outline"
								:loading="uploading || saving"
								@click="openFileSelector"
							>
								<template #prefix><span class="lucide-upload size-4" /></template>
								{{ uploading ? `${progress}%` : __('Upload PDF') }}
							</Button>
						</template>
					</FileUploader>
				</div>
				<p class="mt-1 text-xs text-ink-gray-5">
					{{ __('Click “Upload PDF” and pick a file. Add several one after another — no reload needed.') }}
				</p>
			</div>
		</div>
	</div>

	<!-- New bundle dialog -->
	<Dialog
		v-model:open="showNew"
		:title="__('New Material Bundle')"
		:actions="[{ label: __('Create'), variant: 'solid', onClick: createBundle }]"
	>
		<template #default>
			<div class="space-y-4">
				<FormControl v-model="draft.title" :label="__('Title')" :required="true" />
				<div class="grid grid-cols-2 gap-4">
					<FormControl v-model="draft.amount" type="number" :label="__('Amount')" :required="true" />
					<FormControl v-model="draft.currency" :label="__('Currency')" :required="true" />
				</div>
				<FormControl v-model="draft.description" type="textarea" :label="__('Description')" />
				<FormControl v-model="draft.published" type="checkbox" :label="__('Publish now')" />
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { createResource, Button, Badge, Breadcrumbs, Dialog, FormControl, FileUploader, call, toast, usePageMeta } from 'frappe-ui'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import { formatCurrencyWithCode } from '@/utils/localize'

const API = 'celpipedu.api.materials'
const selected = ref(null)
const saving = ref(false)
const showNew = ref(false)
const newFileLabel = ref('')
const uploaderKey = ref(0)
const draft = reactive({ title: '', amount: 1, currency: 'INR', description: '', published: 0 })

const bundles = createResource({ url: `${API}.list_manage_bundles`, auto: true })

function openNew() {
	Object.assign(draft, { title: '', amount: 1, currency: 'INR', description: '', published: 0 })
	showNew.value = true
}

async function createBundle() {
	try {
		const res = await call(`${API}.create_bundle`, {
			title: draft.title,
			amount: draft.amount,
			currency: draft.currency,
			description: draft.description,
			published: draft.published ? 1 : 0,
		})
		showNew.value = false
		bundles.reload()
		toast.success(__('Bundle created'))
		select(res.name)
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not create bundle'))
	}
}

async function select(name) {
	selected.value = await call(`${API}.get_manage_bundle`, { name })
}

async function saveBundle() {
	saving.value = true
	try {
		await call(`${API}.update_bundle`, {
			name: selected.value.name,
			title: selected.value.title,
			amount: selected.value.amount,
			currency: selected.value.currency,
			description: selected.value.description,
			published: selected.value.published ? 1 : 0,
		})
		bundles.reload()
		toast.success(__('Saved'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not save'))
	} finally {
		saving.value = false
	}
}

async function onUpload(file) {
	// Upload always works; if no label was typed, fall back to the uploaded file's name so the
	// file is never discarded.
	const fallback = (file.file_name || file.name || 'PDF').replace(/\.pdf$/i, '')
	const label = newFileLabel.value || fallback
	saving.value = true
	try {
		await call(`${API}.add_file`, {
			bundle: selected.value.name,
			file_url: file.file_url,
			label,
		})
		newFileLabel.value = ''
		// Remount the FileUploader so its internal state resets and the next PDF can be picked
		// without reloading the page.
		uploaderKey.value += 1
		await select(selected.value.name)
		toast.success(__('File added'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not add file'))
	} finally {
		saving.value = false
	}
}

async function removeFile(f) {
	saving.value = true
	try {
		await call(`${API}.remove_file`, { bundle: selected.value.name, row_name: f.row_name })
		await select(selected.value.name)
		toast.success(__('Removed'))
	} catch (e) {
		toast.error(e.messages?.[0] || __('Could not remove'))
	} finally {
		saving.value = false
	}
}

usePageMeta(() => ({ title: __('Manage Materials') }))
</script>
