// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { FormEvent, useEffect, useState } from 'react'
import { TbCircleCheckFilled, TbLoader } from 'react-icons/tb'
import { useQuery } from '@tanstack/react-query'
import { createPrototypeService } from '@/services/prototype.service'
import { getModel } from '@/services/model.service'
import { useToast } from '../toaster/use-toast'
import useListModelPrototypes from '@/hooks/useListModelPrototypes'
import useCurrentModel from '@/hooks/useCurrentModel'
import { isAxiosError } from 'axios'
import { addLog } from '@/services/log.service'
import useSelfProfileQuery from '@/hooks/useSelfProfile'
import { useNavigate, useLocation } from 'react-router-dom'
import useListBrands from '@/hooks/useListBrands'
import useListModelsByBrand from '@/hooks/useListModelsByBrand'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select'
import { Model, ModelLite, ModelCreate } from '@/types/model.type'
import { Spinner } from '@/components/atoms/spinner'
import { CVI } from '@/data/CVI'
import { createModelService } from '@/services/model.service'
import { cn } from '@/lib/utils'
import default_journey from '@/data/default_journey'
import { SAMPLE_PROJECTS } from '@/data/sampleProjects'

interface FormCreatePrototypeProps {
  onClose?: () => void
  onPrototypeChange?: (data: {
    prototypeName: string
    modelName?: string
    modelId?: string
  }) => void
  disabledState?: [boolean, (disabled: boolean) => void]
  hideCreateButton?: boolean
  code?: string
  widget_config?: string
  title?: string
  buttonText?: string
}

const initialState = {
  prototypeName: '',
  modelName: '',
  language: SAMPLE_PROJECTS[0].language || '',
  code: SAMPLE_PROJECTS[0].data || '',
  cvi: JSON.stringify(CVI),
  mainApi: 'Vehicle',
}

const DEFAULT_DASHBOARD_CFG = `{
  "autorun": false,
  "widgets": [
    {
      "plugin": "Builtin",
      "widget": "Embedded-Widget",
      "options": {
        "api": "Vehicle.Body.Lights.Beam.Low.IsOn",
        "defaultImgUrl": "https://bestudio.digitalauto.tech/project/Ml2Sc9TYoOHc/light_off.png",
        "displayExactMatch": true,
        "valueMaps": [
          {
            "value": true,
            "imgUrl": "https://bestudio.digitalauto.tech/project/Ml2Sc9TYoOHc/light_on.png"
          },
          {
            "value": false,
            "imgUrl": "https://bestudio.digitalauto.tech/project/Ml2Sc9TYoOHc/light_off.png"
          }
        ],
        "url": "https://store-be.digitalauto.tech/data/store-be/Image%20by%20Signal%20value/latest/index/index.html",
        "iconURL": "https://upload.digitalauto.tech/data/store-be/3c3685b3-0b58-4f75-820e-9af0180cf3f0.png"
      },
      "boxes": [
        2,
        3,
        7,
        8
      ],
      "path": ""
    },
    {
      "plugin": "Builtin",
      "widget": "Embedded-Widget",
      "options": {
        "url": "https://store-be.digitalauto.tech/data/store-be/Terminal/latest/terminal/index.html",
        "iconURL": "https://upload.digitalauto.tech/data/store-be/e991ea29-5fbf-42e9-9d3d-cceae23600f0.png"
      },
      "boxes": [
        1,
        6
      ],
      "path": ""
    },
    {
      "plugin": "Builtin",
      "widget": "Embedded-Widget",
      "options": {
        "api": "Vehicle.Body.Lights.Beam.Low.IsOn",
        "lineColor": "#005072",
        "dataUpdateInterval": "1000",
        "maxDataPoints": "30",
        "url": "https://store-be.digitalauto.tech/data/store-be/Chart%20Signal%20Widget/latest/index/index.html",
        "iconURL": "https://upload.digitalauto.tech/data/store-be/f25ceb29-b9e8-470e-897a-4d843e16a0cf.png"
      },
      "boxes": [
        4,
        5
      ],
      "path": ""
    },
    {
      "plugin": "Builtin",
      "widget": "Embedded-Widget",
      "options": {
        "apis": [
          "Vehicle.Body.Lights.Beam.Low.IsOn"
        ],
        "vss_json": "https://bewebstudio.digitalauto.tech/data/projects/sHQtNwric0H7/vss_rel_4.0.json",
        "url": "https://store-be.digitalauto.tech/data/store-be/Signal%20List%20Settable/latest/table-settable/index.html",
        "iconURL": "https://upload.digitalauto.tech/data/store-be/dccabc84-2128-4e5d-9e68-bc20333441c4.png"
      },
      "boxes": [
        9,
        10
      ],
      "path": ""
    }
  ]
}`

const FormCreatePrototype = ({
  onClose,
  onPrototypeChange,
  disabledState,
  hideCreateButton,
  code,
  widget_config,
  title,
  buttonText,
}: FormCreatePrototypeProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState(initialState)
  const [disabled, setDisabled] = disabledState ?? useState(false)

  const { data: currentModel } = useCurrentModel()
  const { data: brands = [] } = useListBrands()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const { data: modelsByBrand, isLoading: isFetchingModels } =
    useListModelsByBrand(selectedBrandId)
  const [localModel, setLocalModel] = useState<ModelLite>()
  const modelIdForTemplate = localModel?.id ?? currentModel?.id
  const { data: modelWithTemplate } = useQuery({
    queryKey: ['model', modelIdForTemplate],
    queryFn: () => getModel(modelIdForTemplate!),
    enabled: !!modelIdForTemplate,
  })
  const { refetch } = useListModelPrototypes(
    currentModel ? currentModel.id : '',
  )
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: currentUser } = useSelfProfileQuery()

  const [projectTemplate, setProjectTemplate] = useState<string>('')

  const handleChange = (name: keyof typeof data, value: string | number) => {
    setData((prev) => ({ ...prev, [name]: value }))
  }

  const onTemplateChange = (v: string) => {
    const template = SAMPLE_PROJECTS.find((project) => project.label === v)
    let code = ''
    let language = ''
    if (template) {
      if (typeof template.data === 'string') {
        code = template.data
        language = template.language
      } else {
        code = JSON.stringify(template.data)
        language = template.language
      }
      setData((prev) => ({ ...prev, code: code, language: language }))
    }
  }

  const getDefaultDashboardCfg = (lang: string) => {
    if (lang == 'rust') return `{"autorun": false, "widgets": [] }`
    const templateWidgetConfig = modelWithTemplate?.custom_template?.widget_config
    if (templateWidgetConfig && typeof templateWidgetConfig === 'object') {
      return JSON.stringify(templateWidgetConfig)
    }
    if (templateWidgetConfig && typeof templateWidgetConfig === 'string') {
      return templateWidgetConfig
    }
    return DEFAULT_DASHBOARD_CFG
  }

  const createNewPrototype = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault() // Prevent the form from submitting

    try {
      setLoading(true)

      // Initialize variables to hold the model ID and response from prototype creation
      let modelId: string
      let response

      if (localModel) {
        modelId = localModel.id
      } else if (currentModel) {
        modelId = currentModel.id
      } else {
        throw new Error('Please select a vehicle model')
      }

      const modelImage =
        localModel?.model_home_image_file ||
        currentModel?.model_home_image_file ||
        '/imgs/default_prototype_cover.jpg'

      const body = {
        model_id: modelId,
        name: data.prototypeName,
        language: data.language,
        state: 'development',
        apis: { VSC: [], VSS: [] },
        code: data.code,
        complexity_level: 3,
        customer_journey: default_journey,
        description: {
          problem: '',
          says_who: '',
          solution: '',
          status: '',
        },
        image_file: modelImage,
        skeleton: '{}',
        tags: [],
        widget_config:
          widget_config || getDefaultDashboardCfg(data.language) || '[]',
        autorun: true,
      }

      // Create the prototype using the model ID

      response = await createPrototypeService(body)

      // Log the prototype creation
      await addLog({
        name: `New prototype '${data.prototypeName}' under model '${localModel?.name || data.modelName}'`,
        description: `Prototype '${data.prototypeName}' was created by ${currentUser?.email || currentUser?.name || currentUser?.id}`,
        type: 'new-prototype',
        create_by: currentUser?.id!,
        ref_id: response.id,
        ref_type: 'prototype',
        parent_id: modelId,
      })

      toast({
        title: ``,
        description: (
          <p className="flex items-center text-sm">
            <TbCircleCheckFilled className="mr-2 h-4 w-4 text-green-500" />
            Prototype "{data.prototypeName}" created successfully
          </p>
        ),
        duration: 3000,
      })

      // Navigate to the new prototype's page
      await navigate(`/model/${modelId}/library/prototype/${response.id}`)

      // Optionally close the form/modal
      if (onClose) onClose()

      // Reset form data
      setData(initialState)

      // Refetch data
      await refetch()
    } catch (error) {
      if (isAxiosError(error)) {
        setError(error.response?.data?.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentModel) {
      const modelLite = {
        id: currentModel.id,
        name: currentModel.name,
        visibility: currentModel.visibility,
        model_home_image_file: currentModel.model_home_image_file || '',
        created_at: currentModel.created_at,
        created_by: currentModel.created_by,
        tags: currentModel.tags,
      }
      setLocalModel({
        ...modelLite,
        created_by: (modelLite.created_by as any)?.id || modelLite.created_by,
      })
    } else {
      setLocalModel(undefined)
    }
  }, [currentModel])

  // Reset selected model when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      setLocalModel(undefined)
    }
  }, [selectedBrandId])

  const modelsByBrandList = modelsByBrand?.results ?? []

  useEffect(() => {
    const hasModel = !!localModel || !!data.modelName
    const canSubmit = hasModel && data.prototypeName && !loading
    setDisabled(!canSubmit)
    if (onPrototypeChange) {
      if (localModel) {
        onPrototypeChange({
          prototypeName: data.prototypeName,
          modelId: localModel.id,
          modelName: undefined,
        })
      } else {
        onPrototypeChange({
          prototypeName: data.prototypeName,
          modelName: data.modelName,
          modelId: undefined,
        })
      }
    }
  }, [loading, localModel, data.modelName, data.prototypeName])

  return (
    <form
      onSubmit={createNewPrototype}
      className="flex flex-col bg-background"
    >
      <h2 className="text-lg font-semibold text-primary">
        {title ?? 'New Prototype'}
      </h2>

      {!currentModel && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col">
            <Label className="mb-2">Car Brand *</Label>
            <Select
              value={selectedBrandId ?? ''}
              onValueChange={(v) => setSelectedBrandId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col">
            <Label className="mb-2">Vehicle Model *</Label>
            {!selectedBrandId ? (
              <p className="text-sm text-muted-foreground">
                Select a brand first to see available models
              </p>
            ) : isFetchingModels ? (
              <p className="flex items-center text-base text-muted-foreground">
                <Spinner className="mr-1 h-4 w-4" />
                Loading models...
              </p>
            ) : modelsByBrandList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No models found for this brand. Create a model first from the model list.
              </p>
            ) : (
              <Select
                value={localModel?.id ?? ''}
                onValueChange={(v) => {
                  const selected = modelsByBrandList.find(
                    (m: ModelLite) => m.id === v,
                  )
                  selected && setLocalModel(selected)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsByBrandList.map((model: ModelLite) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col mt-4">
        <Label className="mb-2">Prototype Name *</Label>
        <Input
          name="name"
          value={data.prototypeName}
          onChange={(e) => handleChange('prototypeName', e.target.value)}
          placeholder="Name"
          data-id="prototype-name-input"
        />
      </div>

      <div className="flex flex-col mt-4">
        <Label className="mb-2">Project Template *</Label>
        <Select
          defaultValue={SAMPLE_PROJECTS[0].label}
          onValueChange={(v: string) => {
            onTemplateChange(v)
          }}
        >
          <SelectTrigger data-id="prototype-language-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAMPLE_PROJECTS.map((project) => (
              <SelectItem key={project.label} value={project.label}>
                {project.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button
        disabled={disabled}
        type="submit"
        data-id="btn-create-prototype"
        className={cn('mt-8 w-full', hideCreateButton && 'hidden')}
      >
        {loading && <TbLoader className="mr-2 animate-spin text-lg" />}
        {buttonText ?? 'Create Prototype'}
      </Button>
    </form>
  )
}

export default FormCreatePrototype
