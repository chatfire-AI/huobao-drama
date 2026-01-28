<template>
  <div class="drama-settings-container">
    <el-page-header @back="goBack" title="返回项目">
      <template #content>
        <h2>项目设置</h2>
      </template>
    </el-page-header>

    <el-card shadow="never" class="main-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="form" label-width="100px" style="max-width: 600px">
            <el-form-item label="项目标题">
              <el-input v-model="form.title" />
            </el-form-item>
            <el-form-item label="项目描述">
              <el-input v-model="form.description" type="textarea" :rows="4" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="form.genre">
                <el-option label="都市" value="都市" />
                <el-option label="古装" value="古装" />
                <el-option label="悬疑" value="悬疑" />
                <el-option label="爱情" value="爱情" />
                <el-option label="喜剧" value="喜剧" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="form.status">
                <el-option label="草稿" value="draft" />
                <el-option label="策划中" value="planning" />
                <el-option label="制作中" value="production" />
                <el-option label="已完成" value="completed" />
                <el-option label="已归档" value="archived" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="样式设置" name="style">
          <el-form :model="form" label-width="120px" style="max-width: 800px">
            <el-divider content-position="left">全局设置</el-divider>
            <el-form-item label="默认风格">
              <el-input 
                v-model="form.default_style" 
                type="textarea" 
                :rows="2" 
                placeholder="全局风格提示词 (例如: Anime, Realistic)" 
              />
            </el-form-item>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="默认图片比例">
                  <el-select v-model="form.default_image_ratio" placeholder="选择比例">
                    <el-option label="16:9" value="16:9" />
                    <el-option label="9:16" value="9:16" />
                    <el-option label="1:1" value="1:1" />
                    <el-option label="4:3" value="4:3" />
                    <el-option label="3:4" value="3:4" />
                    <el-option label="21:9" value="21:9" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="默认视频比例">
                  <el-select v-model="form.default_video_ratio" placeholder="选择比例">
                    <el-option label="16:9" value="16:9" />
                    <el-option label="9:16" value="9:16" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">高级样式覆盖</el-divider>
            
            <el-form-item label="角色风格">
              <el-input v-model="form.default_role_style" type="textarea" :rows="2" placeholder="角色生成专用风格" />
            </el-form-item>
            <el-form-item label="场景风格">
              <el-input v-model="form.default_scene_style" type="textarea" :rows="2" placeholder="场景生成专用风格" />
            </el-form-item>
            <el-form-item label="道具风格">
              <el-input v-model="form.default_prop_style" type="textarea" :rows="2" placeholder="道具生成专用风格" />
            </el-form-item>

            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="角色比例">
                    <el-select v-model="form.default_role_ratio" placeholder="默认">
                      <el-option label="默认" value="" />
                      <el-option label="1:1" value="1:1" />
                      <el-option label="9:16" value="9:16" />
                      <el-option label="3:4" value="3:4" />
                    </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="道具比例">
                    <el-select v-model="form.default_prop_ratio" placeholder="默认">
                      <el-option label="默认" value="" />
                      <el-option label="1:1" value="1:1" />
                      <el-option label="4:3" value="4:3" />
                    </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="图片尺寸">
                     <el-select v-model="form.default_image_size" placeholder="默认">
                        <el-option label="默认" value="" />
                        <el-option label="1024x1024" value="1024x1024" />
                        <el-option label="1280x720" value="1280x720" />
                        <el-option label="720x1280" value="720x1280" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>

            <el-form-item>
              <el-button type="primary" @click="saveSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="危险操作" name="danger">
          <el-alert
            title="警告"
            type="warning"
            description="以下操作不可恢复，请谨慎操作"
            :closable="false"
            show-icon
          />
          <div class="danger-zone">
            <el-button type="danger" @click="deleteProject">删除项目</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dramaAPI } from '@/api/drama'

const route = useRoute()
const router = useRouter()
const dramaId = route.params.id as string

const activeTab = ref('basic')
const form = reactive({
  title: '',
  description: '',
  genre: '',
  status: 'draft' as any,
  default_style: '',
  default_image_ratio: '',
  default_video_ratio: '',
  default_role_style: '',
  default_scene_style: '',
  default_prop_style: '',
  default_role_ratio: '',
  default_prop_ratio: '',
  default_image_size: ''
})

const goBack = () => {
  router.push(`/dramas/${dramaId}`)
}

const saveSettings = async () => {
  try {
    await dramaAPI.update(dramaId, form)
    ElMessage.success('设置保存成功')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const deleteProject = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此项目吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await dramaAPI.delete(dramaId)
    ElMessage.success('项目已删除')
    router.push('/dramas')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(async () => {
  try {
    const drama = await dramaAPI.get(dramaId)
    Object.assign(form, drama)
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  }
})
</script>

<style scoped>
.drama-settings-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  margin-top: 20px;
}

.danger-zone {
  margin-top: 20px;
  padding: 20px;
  text-align: center;
}
</style>
